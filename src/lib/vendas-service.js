import { base44 } from "@/api/base44Client";

// Calcula totais derivados de um fechamento.
export function calcularTotais(fechamento) {
  const totalVendas = (fechamento.vendas_por_canal || []).reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const totalPagDeclarado = (fechamento.vendas_por_pagamento || []).reduce((s, p) => s + (Number(p.valor_declarado) || 0), 0);
  const totalPagConferido = (fechamento.vendas_por_pagamento || []).reduce((s, p) => s + (Number(p.valor_conferido) || 0), 0);
  const totalSangrias = (fechamento.sangrias || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const totalDespesas = (fechamento.despesas_caixa || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const divergencia = Number((totalVendas - totalPagConferido).toFixed(2));
  return {
    total_vendas: round(totalVendas),
    total_pagamentos_declarado: round(totalPagDeclarado),
    total_pagamentos_conferido: round(totalPagConferido),
    total_sangrias: round(totalSangrias),
    total_despesas: round(totalDespesas),
    divergencia,
  };
}

const round = (n) => Number(Number(n || 0).toFixed(2));

// Adiciona N dias a uma data ISO yyyy-mm-dd
function addDias(dataISO, dias) {
  const d = new Date(dataISO + "T00:00:00");
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

// Regenera os recebíveis previstos quando o fechamento é conferido/fechado.
// Apaga os recebíveis "previstos" anteriores deste fechamento e recria a partir das formas de pagamento.
// Dinheiro não gera recebível futuro.
export async function regerarRecebiveis(fechamento, formasPagamento) {
  const previos = await base44.entities.Recebivel.filter({ fechamento_id: fechamento.id });
  for (const r of previos) {
    if (r.status === "previsto") await base44.entities.Recebivel.delete(r.id);
  }
  const novos = [];
  for (const p of fechamento.vendas_por_pagamento || []) {
    const valor = Number(p.valor_conferido) || Number(p.valor_declarado) || 0;
    if (valor <= 0) continue;
    const forma = formasPagamento.find((f) => f.id === p.forma_id);
    if (!forma) continue;
    if (forma.tipo === "dinheiro") continue;
    const taxa = Number(forma.taxa_percentual) || 0;
    const prazo = Number(forma.prazo_recebimento_dias) || 0;
    const liquido = round(valor * (1 - taxa / 100));
    novos.push({
      fechamento_id: fechamento.id,
      loja_id: fechamento.loja_id,
      forma_id: forma.id,
      forma_nome: forma.nome,
      data_venda: fechamento.data,
      data_prevista: addDias(fechamento.data, prazo),
      valor_bruto: round(valor),
      taxa_percentual: taxa,
      valor_liquido: liquido,
      status: "previsto",
    });
  }
  if (novos.length) await base44.entities.Recebivel.bulkCreate(novos);
}