import { base44 } from "@/api/base44Client";

const round = (n) => Number(Number(n || 0).toFixed(2));

/**
 * Sinal sob a ótica do SÓCIO:
 *  +1  →  empresa passa a dever ao sócio
 *  -1  →  sócio passa a dever à empresa
 *   0  →  acerto neutro (usa campo `sinal` informado em observações)
 */
export const SINAL_POR_TIPO = {
  // Empresa deve ao sócio
  despesa_empresa_paga_pela_pf: +1,
  aporte_socio: +1,
  emprestimo_socio: +1,
  uso_cheque_especial_pf: +1,
  juros_cheque_especial_pf: +1,

  // Sócio deve à empresa
  despesa_pessoal_paga_pela_empresa: -1,
  recebimento_empresa_em_pf: -1,
  retirada_socio: -1,

  // Reduzem / ajustam
  reembolso_ao_socio: -1,        // empresa pagou de volta → reduz dívida com sócio
  devolucao_socio_empresa: +1,   // sócio pagou de volta → reduz dívida com empresa
  acerto_saldo: 0,
};

export const ROTULO_TIPO = {
  despesa_empresa_paga_pela_pf: "Paguei conta da empresa pela PF",
  despesa_pessoal_paga_pela_empresa: "Empresa pagou gasto pessoal",
  recebimento_empresa_em_pf: "Venda caiu na minha PF",
  aporte_socio: "Aporte do sócio",
  emprestimo_socio: "Empréstimo do sócio",
  uso_cheque_especial_pf: "Empresa usou cheque especial PF (principal)",
  juros_cheque_especial_pf: "Juros de cheque especial PF (causa empresa)",
  reembolso_ao_socio: "Reembolso ao sócio",
  retirada_socio: "Retirada pessoal do sócio",
  devolucao_socio_empresa: "Devolução do sócio à empresa",
  acerto_saldo: "Acerto de saldo",
};

/**
 * Tipos que IMPACTAM a DRE quando ocorrem.
 * - despesa_empresa_paga_pela_pf: despesa operacional (pela categoria escolhida)
 * - juros_cheque_especial_pf: despesa financeira
 * - recebimento_empresa_em_pf: receita (a empresa de fato recebeu, mesmo que em conta PF)
 *
 * NÃO afetam DRE como receita/despesa operacional:
 * aporte_socio, emprestimo_socio, uso_cheque_especial_pf (principal),
 * retirada_socio, reembolso_ao_socio, devolucao_socio_empresa, acerto_saldo,
 * despesa_pessoal_paga_pela_empresa (vira CR contra o sócio, não despesa).
 */
export const TIPOS_QUE_AFETAM_DRE = new Set([
  "despesa_empresa_paga_pela_pf",
  "juros_cheque_especial_pf",
  "recebimento_empresa_em_pf",
]);

// Sugestões de geração automática de CP/CR (checkbox marcado por padrão)
export const SUGESTAO_GERAR_CP = new Set([
  "despesa_empresa_paga_pela_pf",
  "emprestimo_socio",
  "uso_cheque_especial_pf",
  "juros_cheque_especial_pf",
]);
export const SUGESTAO_GERAR_CR = new Set([
  "recebimento_empresa_em_pf",
  "despesa_pessoal_paga_pela_empresa",
  "retirada_socio",
]);

export function calcularSaldoSocio(movimentos) {
  let saldo = 0;
  for (const m of movimentos) {
    if (m.status === "cancelado") continue;
    const sinal = SINAL_POR_TIPO[m.tipo_movimento] ?? 0;
    saldo += sinal * (Number(m.valor) || 0);
  }
  return round(saldo);
}

export function totaisSemana(movimentos, hoje = new Date()) {
  const fim = new Date(hoje); fim.setHours(23, 59, 59, 999);
  const ini = new Date(hoje); ini.setDate(ini.getDate() - 6); ini.setHours(0, 0, 0, 0);
  const within = movimentos.filter((m) => {
    if (!m.data || m.status === "cancelado") return false;
    const d = new Date(m.data);
    return d >= ini && d <= fim;
  });
  const sum = (tipo) => within.filter((m) => m.tipo_movimento === tipo).reduce((s, m) => s + (Number(m.valor) || 0), 0);
  return {
    inicio: ini.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
    empresa_usou_pf: round(sum("despesa_empresa_paga_pela_pf") + sum("uso_cheque_especial_pf")),
    entrou_pf_da_empresa: round(sum("recebimento_empresa_em_pf")),
    retiradas: round(sum("retirada_socio")),
    despesas_pessoais_pela_empresa: round(sum("despesa_pessoal_paga_pela_empresa")),
    juros_pf: round(sum("juros_cheque_especial_pf")),
    aportes: round(sum("aporte_socio") + sum("emprestimo_socio")),
    reembolsos: round(sum("reembolso_ao_socio")),
    devolucoes: round(sum("devolucao_socio_empresa")),
  };
}

/**
 * Cria MovimentoSocio + opcionalmente ContaPagar/ContaReceber em ABERTO (modelo híbrido).
 *
 * Regras DRE:
 * - Quando o tipo afeta DRE, a CP/CR gerada já leva categoria_id da DRE correta.
 *   Exemplo: despesa_empresa_paga_pela_pf → CP em aberto na categoria operacional.
 *            juros_cheque_especial_pf    → CP em aberto na categoria de despesas financeiras.
 *            recebimento_empresa_em_pf   → CR em aberto na categoria de receita.
 * - Quando NÃO afeta DRE (aporte, retirada, etc.), CP/CR é gerada apenas como
 *   controle de dívida sócio↔empresa (sem categoria DRE — usuário pode informar
 *   uma categoria de "movimentação sócio" se quiser).
 */
export async function criarMovimentoSocio(payload) {
  const {
    data, valor, tipo_movimento, socio_id, socio_nome, loja_id,
    conta_origem_id, conta_destino_id,
    categoria_id, centro_custo_id, descricao, comprovante_url, observacoes,
    gerar_conta_pagar, gerar_conta_receber, data_vencimento, competencia,
  } = payload;

  if (!data || !valor || !tipo_movimento) throw new Error("Dados incompletos");
  const v = round(Math.abs(valor));
  if (v <= 0) throw new Error("Valor deve ser maior que zero");

  let usuario_email;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* ignore */ }

  const afeta_dre = TIPOS_QUE_AFETAM_DRE.has(tipo_movimento);
  const compet = competencia || (data || "").slice(0, 7);

  let conta_pagar_id;
  let conta_receber_id;

  // ContaPagar em ABERTO (sócio é o favorecido)
  if (gerar_conta_pagar) {
    const cp = await base44.entities.ContaPagar.create({
      descricao: descricao || ROTULO_TIPO[tipo_movimento],
      data_emissao: data,
      data_vencimento: data_vencimento || data,
      valor: v,
      valor_pago: 0,
      status: "aberta",
      loja_id,
      categoria_id: afeta_dre ? categoria_id : undefined,
      centro_custo_id,
      observacoes: `Origem: MovimentoSocio (${ROTULO_TIPO[tipo_movimento]}). Favorecido: ${socio_nome || "Sócio"}. ${observacoes || ""}`.trim(),
    });
    conta_pagar_id = cp.id;
  }

  // ContaReceber em ABERTO (sócio é o devedor)
  if (gerar_conta_receber) {
    const cr = await base44.entities.ContaReceber.create({
      descricao: descricao || ROTULO_TIPO[tipo_movimento],
      cliente: socio_nome || "Sócio",
      data_emissao: data,
      data_vencimento: data_vencimento || data,
      valor: v,
      valor_recebido: 0,
      status: "aberta",
      loja_id,
      categoria_id: afeta_dre ? categoria_id : undefined,
      centro_custo_id,
      observacoes: `Origem: MovimentoSocio (${ROTULO_TIPO[tipo_movimento]}). Devedor: ${socio_nome || "Sócio"}. ${observacoes || ""}`.trim(),
    });
    conta_receber_id = cr.id;
  }

  return base44.entities.MovimentoSocio.create({
    socio_id, socio_nome: socio_nome || "Sócio", loja_id,
    data, competencia: compet, tipo_movimento, valor: v,
    conta_origem_id, conta_destino_id,
    categoria_id, centro_custo_id, descricao, comprovante_url, observacoes,
    gerar_conta_pagar: !!gerar_conta_pagar,
    gerar_conta_receber: !!gerar_conta_receber,
    data_vencimento,
    conta_pagar_id, conta_receber_id,
    afeta_dre,
    status: "registrado",
    usuario_email,
  });
}

export async function listarMovimentosSocio() {
  return base44.entities.MovimentoSocio.list("-data", 500);
}