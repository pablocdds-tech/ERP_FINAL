import { base44 } from "@/api/base44Client";

const round = (n) => Number(Number(n || 0).toFixed(2));

/**
 * Sinal do movimento sob a ótica do SÓCIO.
 *  > 0  →  empresa deve para o sócio (sócio aumentou crédito).
 *  < 0  →  sócio deve para a empresa.
 */
export const SINAL_POR_TIPO = {
  despesa_empresa_paga_pf: +1,   // sócio gastou pela empresa
  uso_cheque_especial_pf: +1,    // empresa usou conta PF
  juros_pf_empresa: +1,          // juros PF causados pela empresa
  aporte_socio: +1,              // sócio injetou dinheiro
  reembolso_socio: -1,           // empresa devolveu para o sócio
  retirada_socio: -1,            // sócio tirou dinheiro
  despesa_pessoal_paga_empresa: -1, // empresa pagou conta pessoal
  recebimento_empresa_em_pf: -1, // dinheiro da empresa ficou na PF
  devolucao_socio: -1,           // sócio devolveu p/ empresa
  acerto_saldo: 0,               // ajuste manual com sinal informado
};

export const ROTULO_TIPO = {
  despesa_empresa_paga_pf: "Paguei conta da empresa pela PF",
  despesa_pessoal_paga_empresa: "Empresa pagou gasto pessoal",
  recebimento_empresa_em_pf: "Venda caiu na minha PF",
  aporte_socio: "Aporte/empréstimo do sócio",
  uso_cheque_especial_pf: "Usei cheque especial PF na empresa",
  juros_pf_empresa: "Juros/encargos PF causados pela empresa",
  reembolso_socio: "Empresa me reembolsou",
  retirada_socio: "Fiz retirada pessoal",
  devolucao_socio: "Devolvi dinheiro para a empresa",
  acerto_saldo: "Acerto de saldo",
};

export const TIPOS_QUE_AFETAM_DRE = new Set([
  "despesa_empresa_paga_pf",
  "juros_pf_empresa",
  "recebimento_empresa_em_pf",
]);

export function calcularSaldoSocio(movimentos) {
  let saldo = 0;
  for (const m of movimentos) {
    const sinal = SINAL_POR_TIPO[m.tipo] ?? 0;
    saldo += sinal * (Number(m.valor) || 0);
  }
  return round(saldo);
}

export function totaisSemana(movimentos, hoje = new Date()) {
  const fim = new Date(hoje); fim.setHours(23, 59, 59, 999);
  const ini = new Date(hoje); ini.setDate(ini.getDate() - 6); ini.setHours(0, 0, 0, 0);
  const within = movimentos.filter((m) => {
    if (!m.data) return false;
    const d = new Date(m.data);
    return d >= ini && d <= fim;
  });
  const sum = (tipo) => within.filter((m) => m.tipo === tipo).reduce((s, m) => s + (Number(m.valor) || 0), 0);
  return {
    inicio: ini.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
    empresa_usou_pf: round(sum("despesa_empresa_paga_pf") + sum("uso_cheque_especial_pf")),
    entrou_pf_da_empresa: round(sum("recebimento_empresa_em_pf")),
    retiradas: round(sum("retirada_socio")),
    despesas_pessoais_pela_empresa: round(sum("despesa_pessoal_paga_empresa")),
    juros_pf: round(sum("juros_pf_empresa")),
    aportes: round(sum("aporte_socio")),
    reembolsos: round(sum("reembolso_socio")),
  };
}

/**
 * Cria o movimento de sócio + integrações híbridas.
 * - despesa_empresa_paga_pf  → ContaPagar JÁ baixada (afeta DRE)
 * - juros_pf_empresa         → ContaPagar JÁ baixada (afeta DRE - financeiras)
 * - recebimento_empresa_em_pf→ ContaReceber JÁ recebida (afeta DRE)
 * - demais tipos             → APENAS MovimentoSocio (não tocam DRE)
 */
export async function criarMovimentoSocio(payload) {
  const {
    data, valor, tipo, socio_nome, loja_id, conta_bancaria_id,
    categoria_id, centro_custo_id, descricao, comprovante_url, observacoes,
  } = payload;

  if (!data || !valor || !tipo) throw new Error("Dados incompletos");
  const v = round(Math.abs(valor));
  if (v <= 0) throw new Error("Valor deve ser maior que zero");

  let usuario_email;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* ignore */ }

  const base = {
    data, valor: v, tipo, socio_nome: socio_nome || "Sócio",
    loja_id, conta_bancaria_id, categoria_id, centro_custo_id,
    descricao, comprovante_url, observacoes, usuario_email,
    afeta_dre: TIPOS_QUE_AFETAM_DRE.has(tipo),
  };

  let conta_pagar_id, conta_receber_id;

  if (tipo === "despesa_empresa_paga_pf" || tipo === "juros_pf_empresa") {
    const cp = await base44.entities.ContaPagar.create({
      descricao: descricao || ROTULO_TIPO[tipo],
      data_emissao: data,
      data_vencimento: data,
      data_pagamento: data,
      valor: v,
      valor_pago: v,
      status: "paga",
      loja_id,
      categoria_id,
      centro_custo_id,
      conta_bancaria_id,
      origem_tipo: "movimento_socio",
      observacoes: `Origem: ${ROTULO_TIPO[tipo]}. ${observacoes || ""}`.trim(),
    });
    conta_pagar_id = cp.id;
  } else if (tipo === "recebimento_empresa_em_pf") {
    const cr = await base44.entities.ContaReceber.create({
      descricao: descricao || ROTULO_TIPO[tipo],
      data_emissao: data,
      data_vencimento: data,
      data_recebimento: data,
      valor: v,
      valor_recebido: v,
      status: "recebida",
      loja_id,
      categoria_id,
      centro_custo_id,
      conta_bancaria_id,
      origem_tipo: "movimento_socio",
      observacoes: `Dinheiro ficou na PF do sócio. ${observacoes || ""}`.trim(),
    });
    conta_receber_id = cr.id;
  }

  return base44.entities.MovimentoSocio.create({
    ...base,
    conta_pagar_id,
    conta_receber_id,
  });
}

export async function listarMovimentosSocio() {
  return base44.entities.MovimentoSocio.list("-data", 500);
}