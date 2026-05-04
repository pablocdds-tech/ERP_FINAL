// Orquestra o ciclo de vida de um ComandoExecutor:
// criar (aguardando confirmação) → confirmar/cancelar → executar ou aprovar.

import { base44 } from "@/api/base44Client";
import { getPerfilChave } from "@/lib/perfil";
import { logInteracao } from "@/lib/ai-log";
import { interpretarComando, classificar, executarPlano } from "@/lib/executor-operacional";

// Cria um ComandoExecutor a partir do comando livre, já com o plano interpretado.
export async function criarComando({ comando, modelo, usuario }) {
  const plano = await interpretarComando({ comando, modelo });
  const cls = classificar(plano.intencao);

  const status =
    cls.tipo === "proibida" ? "rejeitado" :
    cls.tipo === "sensivel" ? "aguardando_aprovacao" :
    cls.tipo === "desconhecida" ? "rejeitado" :
    "aguardando_confirmacao";

  const exige_aprovacao = cls.tipo === "sensivel";
  const motivo_aprovacao = cls.motivo || (cls.tipo === "proibida" ? cls.motivo : "");

  const registro = await base44.entities.ComandoExecutor.create({
    comando_original: comando,
    usuario_email: usuario?.email,
    usuario_nome: usuario?.full_name,
    perfil_usuario: getPerfilChave(usuario),
    agente_chave: "executor_operacional",
    agente_nome: "Executor Operacional",
    modelo_ia: plano.modelo_usado,
    intencao: plano.intencao,
    plano_resumo: plano.plano_resumo,
    plano_dados: JSON.stringify(plano.dados || {}),
    modulo_afetado: plano.modulo_afetado || "rotinas",
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
      dados_depois: out.dados_depois,
      log_execucao: out.log_execucao,
      executado_em: new Date().toISOString(),
    });

    await logInteracao({
      agentChave: "executor_operacional",
      agentNome: "Executor Operacional",
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
      agentChave: "executor_operacional",
      agentNome: "Executor Operacional",
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

// Aprovação humana: gestor aprova → executa em seguida.
export async function aprovarComando({ comandoId, aprovador }) {
  const cmd = await base44.entities.ComandoExecutor.get(comandoId);
  if (cmd.status !== "aguardando_aprovacao") {
    throw new Error(`Comando não está aguardando aprovação (status atual: ${cmd.status}).`);
  }
  await base44.entities.ComandoExecutor.update(comandoId, {
    status: "aguardando_confirmacao",
    aprovado_por: aprovador?.email,
    aprovado_em: new Date().toISOString(),
  });
  return confirmarComando({ comandoId });
}

export async function rejeitarComando({ comandoId, aprovador, motivo }) {
  return base44.entities.ComandoExecutor.update(comandoId, {
    status: "rejeitado",
    aprovado_por: aprovador?.email,
    aprovado_em: new Date().toISOString(),
    erro_detalhe: motivo || "Rejeitado pelo aprovador",
  });
}