import { base44 } from "@/api/base44Client";

// Calcula NPS a partir de uma lista de avaliações com nps_score
export function calcularNPS(avaliacoes) {
  const validas = avaliacoes.filter((a) => typeof a.nps_score === "number");
  if (validas.length === 0) return { total: 0, promotores: 0, neutros: 0, detratores: 0, nps: 0 };
  const promotores = validas.filter((a) => a.nps_score >= 9).length;
  const detratores = validas.filter((a) => a.nps_score <= 6).length;
  const neutros = validas.length - promotores - detratores;
  const nps = ((promotores - detratores) / validas.length) * 100;
  return { total: validas.length, promotores, neutros, detratores, nps };
}

// Agrupa reclamações por motivo
export function agruparPorMotivo(reclamacoes) {
  const map = new Map();
  reclamacoes.forEach((r) => {
    const k = r.motivo || "outro";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([motivo, qtd]) => ({ motivo, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
}

// Calcula tempo de resposta médio (horas)
export function tempoMedioResposta(reclamacoes) {
  const com = reclamacoes.filter((r) => typeof r.tempo_resposta_horas === "number");
  if (com.length === 0) return 0;
  return com.reduce((s, r) => s + r.tempo_resposta_horas, 0) / com.length;
}

// Detecta problemas recorrentes (mesmo motivo + mesma loja >= 3 em 30 dias)
export function detectarRecorrentes(reclamacoes, dias = 30, minimo = 3) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const recentes = reclamacoes.filter((r) => r.data && new Date(r.data) >= limite);
  const map = new Map();
  recentes.forEach((r) => {
    const k = `${r.loja_id || "_"}|${r.motivo || "outro"}`;
    if (!map.has(k)) map.set(k, { loja_id: r.loja_id, motivo: r.motivo, qtd: 0 });
    map.get(k).qtd += 1;
  });
  return Array.from(map.values()).filter((x) => x.qtd >= minimo).sort((a, b) => b.qtd - a.qtd);
}

// Cria cortesia a partir de uma reclamação e dispara alerta financeiro
export async function criarCortesiaDeReclamacao(reclamacao, dados) {
  const cortesia = await base44.entities.Cortesia.create({
    data: dados.data || new Date().toISOString().slice(0, 10),
    loja_id: reclamacao.loja_id,
    cliente_id: reclamacao.cliente_id,
    cliente_nome: reclamacao.cliente_nome,
    reclamacao_id: reclamacao.id,
    tipo: dados.tipo || "produto",
    descricao: dados.descricao || `Cortesia por reclamação: ${reclamacao.titulo}`,
    valor_estimado: dados.valor_estimado || 0,
    autorizado_por: dados.autorizado_por,
    alerta_financeiro: true,
  });
  await base44.entities.Reclamacao.update(reclamacao.id, {
    cortesia_id: cortesia.id,
    tipo_solucao: "cortesia",
    valor_compensacao: (reclamacao.valor_compensacao || 0) + (dados.valor_estimado || 0),
  });
  return cortesia;
}

// Cria reembolso a partir de uma reclamação
export async function criarReembolsoDeReclamacao(reclamacao, dados) {
  const reembolso = await base44.entities.Reembolso.create({
    data: dados.data || new Date().toISOString().slice(0, 10),
    loja_id: reclamacao.loja_id,
    cliente_id: reclamacao.cliente_id,
    cliente_nome: reclamacao.cliente_nome,
    reclamacao_id: reclamacao.id,
    valor: dados.valor || 0,
    forma_pagamento_id: dados.forma_pagamento_id,
    pedido_referencia: reclamacao.pedido_referencia,
    motivo: dados.motivo || reclamacao.titulo,
    autorizado_por: dados.autorizado_por,
    status: "pendente",
    alerta_financeiro: true,
  });
  await base44.entities.Reclamacao.update(reclamacao.id, {
    reembolso_id: reembolso.id,
    tipo_solucao: "reembolso",
    valor_compensacao: (reclamacao.valor_compensacao || 0) + (dados.valor || 0),
  });
  return reembolso;
}

// Marca reclamação como resolvida (calcula tempo de resposta)
export async function resolverReclamacao(reclamacao, solucao, responsavel) {
  const agora = new Date();
  const criada = new Date(reclamacao.created_date || reclamacao.data || agora);
  const horas = Math.max(0, (agora - criada) / (1000 * 60 * 60));
  await base44.entities.Reclamacao.update(reclamacao.id, {
    status_tratativa: "resolvida",
    solucao,
    responsavel_tratativa: responsavel,
    resolvida_em: agora.toISOString(),
    tempo_resposta_horas: Math.round(horas * 10) / 10,
  });
}