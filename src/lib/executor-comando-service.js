// Orquestra o ciclo de vida de um ComandoExecutor (Agent Executor ERP):
// criar (aguardando confirmação / rascunho) → confirmar/cancelar → executar.

import { base44 } from "@/api/base44Client";
import { getPerfilChave } from "@/lib/perfil";
import { logInteracao } from "@/lib/ai-log";
import { interpretarComando, corrigirComando as corrigirPlanoIA, classificar, executarPlano } from "@/lib/executor-operacional";

// Empacota os dados do plano + metadados de leitura em um único JSON serializado
// (guardado em ComandoExecutor.plano_dados), evitando alterar o schema da entidade.
function empacotarPlanoDados(plano) {
  return JSON.stringify({
    ...(plano.dados || {}),
    _meta: {
      tipo_documento: plano.tipo_documento || "",
      imagem_ilegivel: !!plano.imagem_ilegivel,
      campos_incertos: plano.campos_incertos || [],
      campos_ausentes: plano.campos_ausentes || [],
      rascunho: !!plano.rascunho,
      confianca: plano.confianca,
      raciocinio: plano.raciocinio || "",
      alertas: Array.isArray(plano.alertas) ? plano.alertas : [],
      duplicidade_suspeita: !!plano.duplicidade_suspeita,
      duplicidade_detalhe: plano.duplicidade_detalhe || "",
    },
  });
}

// Calcula status/aprovação de um plano (usado ao criar e ao corrigir).
function avaliarPlano(plano) {
  const cls = classificar(plano);
  let status = "aguardando_confirmacao";
  let exige_aprovacao = false;
  let motivo_aprovacao = "";

  if (plano.imagem_ilegivel) {
    status = "pendente_revisao";
    motivo_aprovacao = "Não consegui ler o documento com segurança. Envie uma foto mais nítida, pegando o documento inteiro, com boa iluminação.";
  } else if (cls.tipo === "proibida" || cls.tipo === "desconhecida") {
    status = "rejeitado";
    motivo_aprovacao = cls.motivo;
  } else if (plano.precisa_esclarecimento) {
    status = "pendente_revisao";
    motivo_aprovacao = plano.pergunta_esclarecimento || "Faltam informações críticas.";
  } else if (plano.rascunho) {
    status = "aguardando_confirmacao";
    motivo_aprovacao = plano.motivo_rascunho || "Algumas informações estão incompletas — confira antes de confirmar.";
  } else if (cls.tipo === "confirmacao_extra") {
    status = "aguardando_confirmacao";
    motivo_aprovacao = cls.motivo;
    exige_aprovacao = true;
  }
  return { cls, status, exige_aprovacao, motivo_aprovacao };
}

const AGENT_CHAVE = "executor_erp";
const AGENT_NOME = "Executor ERP";

// Cria um ComandoExecutor a partir do comando livre, já com o plano interpretado.
export async function criarComando({ comando, modelo, usuario, files }) {
  const plano = await interpretarComando({ comando, modelo, files });
  const { cls, status, exige_aprovacao, motivo_aprovacao } = avaliarPlano(plano);

  const registro = await base44.entities.ComandoExecutor.create({
    comando_original: comando || (Array.isArray(files) && files.length ? "[documento anexado]" : ""),
    anexos_urls: Array.isArray(files) ? files : undefined,
    usuario_email: usuario?.email,
    usuario_nome: usuario?.full_name,
    perfil_usuario: getPerfilChave(usuario),
    agente_chave: AGENT_CHAVE,
    agente_nome: AGENT_NOME,
    modelo_ia: plano.modelo_usado,
    intencao: plano.intencao,
    plano_resumo: plano.plano_resumo,
    plano_dados: empacotarPlanoDados(plano),
    modulo_afetado: plano.modulo_afetado || "cadastros",
    loja_id: plano.dados?.loja_id || undefined,
    status,
    exige_aprovacao,
    motivo_aprovacao,
  });

  return { comando: registro, plano, classificacao: cls };
}

// Aplica uma correção em linguagem natural a um comando que aguarda confirmação,
// reinterpreta o plano e atualiza o registro (sem executar).
export async function corrigirComando({ comandoId, correcao, modelo }) {
  const cmd = await base44.entities.ComandoExecutor.get(comandoId);
  if (!["aguardando_confirmacao", "pendente_revisao"].includes(cmd.status)) {
    throw new Error(`Comando não pode ser corrigido (status atual: ${cmd.status}).`);
  }
  let dadosAtuais = {};
  try { dadosAtuais = JSON.parse(cmd.plano_dados || "{}"); } catch { dadosAtuais = {}; }
  const meta = dadosAtuais._meta || {};
  delete dadosAtuais._meta;

  const planoAtual = {
    intencao: cmd.intencao,
    plano_resumo: cmd.plano_resumo,
    modulo_afetado: cmd.modulo_afetado,
    tipo_documento: meta.tipo_documento,
    dados: dadosAtuais,
  };

  const planoNovo = await corrigirPlanoIA({ planoAtual, correcao, modelo: modelo || cmd.modelo_ia });
  const { status, exige_aprovacao, motivo_aprovacao } = avaliarPlano(planoNovo);

  return base44.entities.ComandoExecutor.update(comandoId, {
    intencao: planoNovo.intencao,
    plano_resumo: planoNovo.plano_resumo,
    plano_dados: empacotarPlanoDados(planoNovo),
    modulo_afetado: planoNovo.modulo_afetado || cmd.modulo_afetado,
    loja_id: planoNovo.dados?.loja_id || cmd.loja_id || undefined,
    status,
    exige_aprovacao,
    motivo_aprovacao,
  });
}

// Executa um ComandoExecutor já confirmado (status = aguardando_confirmacao).
export async function confirmarComando({ comandoId }) {
  const cmd = await base44.entities.ComandoExecutor.get(comandoId);
  if (cmd.status !== "aguardando_confirmacao") {
    throw new Error(`Comando não está aguardando confirmação (status atual: ${cmd.status}).`);
  }
  const t0 = Date.now();
  const usuario = await base44.auth.me().catch(() => null);
  let dados = {};
  try { dados = cmd.plano_dados ? JSON.parse(cmd.plano_dados) : {}; } catch { dados = {}; }
  delete dados._meta;
  const plano = {
    intencao: cmd.intencao,
    plano_resumo: cmd.plano_resumo,
    dados,
  };

  try {
    const out = await executarPlano({ plano, comando: cmd.comando_original, usuario });
    const atualizado = await base44.entities.ComandoExecutor.update(comandoId, {
      status: "executado",
      registro_entidade: out.registro_entidade,
      registro_id: out.registro_id,
      registros_criados: JSON.stringify(out.registros_criados || []),
      dados_depois: out.dados_depois,
      log_execucao: out.log_execucao,
      executado_em: new Date().toISOString(),
    });

    await logInteracao({
      agentChave: AGENT_CHAVE,
      agentNome: AGENT_NOME,
      modelo: cmd.modelo_ia,
      pergunta: cmd.comando_original,
      resposta: cmd.plano_resumo,
      acaoSugerida: cmd.intencao,
      acaoExecutada: cmd.intencao,
      duracaoMs: Date.now() - t0,
    });

    return atualizado;
  } catch (e) {
    const erro = e?.message || String(e);
    const atualizado = await base44.entities.ComandoExecutor.update(comandoId, {
      status: "erro",
      erro_detalhe: erro,
      log_execucao: `[${new Date().toISOString()}] ERRO: ${erro}`,
    });
    await logInteracao({
      agentChave: AGENT_CHAVE,
      agentNome: AGENT_NOME,
      modelo: cmd.modelo_ia,
      pergunta: cmd.comando_original,
      resposta: erro,
      acaoSugerida: cmd.intencao,
      status: "erro",
      erroDetalhe: erro,
      duracaoMs: Date.now() - t0,
    });
    return atualizado;
  }
}

export async function cancelarComando({ comandoId }) {
  return base44.entities.ComandoExecutor.update(comandoId, { status: "cancelado" });
}