// Helper único para registrar interação de IA em AgentLog.
// Toda chamada feita pela tela /admin/ia/chat passa por aqui.

import { base44 } from "@/api/base44Client";

export async function logInteracao({
  agentChave,
  agentNome,
  modelo,
  pergunta,
  resposta,
  acaoSugerida,
  acaoExecutada,
  status = "concluido",
  erroDetalhe,
  duracaoMs,
}) {
  try {
    const user = await base44.auth.me().catch(() => null);
    const inputResumo = pergunta?.length > 1500 ? pergunta.slice(0, 1500) + "…" : pergunta;
    const outputResumo = resposta?.length > 4000 ? resposta.slice(0, 4000) + "…" : resposta;

    await base44.entities.AgentLog.create({
      agent_chave: agentChave,
      agent_nome: agentNome,
      acao: acaoExecutada || acaoSugerida || "responder",
      tipo: acaoExecutada ? "execucao" : (acaoSugerida ? "sugestao" : "info"),
      input: JSON.stringify({
        usuario: user?.email,
        modelo,
        pergunta: inputResumo,
      }),
      output: JSON.stringify({
        resposta: outputResumo,
        acao_sugerida: acaoSugerida || null,
        acao_executada: acaoExecutada || null,
      }),
      status,
      erro_detalhe: erroDetalhe,
      duracao_ms: duracaoMs,
    });
  } catch (e) {
    console.error("Falha ao registrar AgentLog", e);
  }
}