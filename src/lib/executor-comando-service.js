// Orquestra o ciclo de vida de um ComandoExecutor (Agent Executor ERP):
// criar (aguardando confirmação / rascunho) → confirmar/cancelar → executar.

import { base44 } from "@/api/base44Client";
import { getPerfilChave } from "@/lib/perfil";
import { logInteracao } from "@/lib/ai-log";
import { interpretarComando, classificar, executarPlano } from "@/lib/executor-operacional";

const AGENT_CHAVE = "executor_erp";
const AGENT_NOME = "Executor ERP";

// Cria um ComandoExecutor a partir do comando livre, já com o plano interpretado.
export async function criarComando({ comando, modelo, usuario }) {
  const plano = await interpretarComando({ comando, modelo });
  const cls = classificar(plano);

  let status;
  let exige_aprovacao = false;
  let motivo_aprovacao = "";

  if (cls.tipo === "proibida") {
    status = "rejeitado";
    motivo_aprovacao = cls.motivo;
  } else if (cls.tipo === "desconhecida") {
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
  } else {
    status = "aguardando_confirmacao";
  }

  const registro = await base44.entities.ComandoExecutor.create({
    comando_original: comando,
    usuario_email: usuario?.email,
    usuario_nome: usuario?.full_name,
    perfil_usuario: getPerfilChave(usuario),
    agente_chave: AGENT_CHAVE,
    agente_nome: AGENT_NOME,
    modelo_ia: plano.modelo_usado,
    intencao: plano.intencao,
    plano_resumo: plano.plano_resumo,
    plano_dados: JSON.stringify(plano.dados || {}),
    modulo_afetado: plano.modulo_afetado || "cadastros",
    loja_id: plano.dados?.loja_id || undefined,
    status,
    exige_aprovacao,
    motivo_aprovacao,
  });

  return { comando: registro, plano, classificacao: cls };
}

// Executa um ComandoExecutor já confirmado (status = aguardando_confirmacao).
export async function confirmarComando({ comandoId }) {
  const cmd = await base44.entities.ComandoExecutor.get(comandoId);
  if (cmd.status !== "aguardando_confirmacao") {
    throw new Error(`Comando não está aguardando confirmação (status atual: ${cmd.status}).`);
  }
  const t0 = Date.now();
  const usuario = await base44.auth.me().catch(() => null);
  const plano = {
    intencao: cmd.intencao,
    plano_resumo: cmd.plano_resumo,
    dados: cmd.plano_dados ? JSON.parse(cmd.plano_dados) : {},
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