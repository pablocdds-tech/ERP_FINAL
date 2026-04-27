import { base44 } from "@/api/base44Client";

const round = (n) => Number(Number(n || 0).toFixed(2));

// --- Auditoria ---
export async function registrarAuditoria({ entidade, entidade_id, acao, snapshot_antes, snapshot_depois, motivo }) {
  let usuario_email;
  try {
    const u = await base44.auth.me();
    usuario_email = u?.email;
  } catch { /* ignore */ }
  await base44.entities.AuditoriaFinanceira.create({
    entidade,
    entidade_id,
    acao,
    data: new Date().toISOString(),
    usuario_email,
    snapshot_antes: snapshot_antes || {},
    snapshot_depois: snapshot_depois || {},
    motivo: motivo || "",
  });
}

// --- Saldo bancário (real) ---
// Calcula saldo de cada conta a partir de saldo_inicial + movimentações.
export function calcularSaldosBancarios(contas, movimentacoes) {
  const map = new Map();
  for (const c of contas) {
    map.set(c.id, { conta_id: c.id, conta_nome: c.nome, loja_id: c.loja_id, saldo: Number(c.saldo_inicial) || 0 });
  }
  for (const m of movimentacoes) {
    const cur = map.get(m.conta_bancaria_id);
    if (!cur) continue;
    const v = Number(m.valor) || 0;
    const sinal = ["credito", "transferencia_entrada", "saldo_inicial"].includes(m.tipo) ? 1 : -1;
    cur.saldo = round(cur.saldo + sinal * v);
  }
  return map;
}

// --- Baixa financeira ---
// Gera movimentação bancária + atualiza documento + cria registro de baixa + auditoria.
export async function baixarDocumento({ documento, documento_tipo, valor, data, conta_bancaria_id, forma_pagamento_id, observacoes }) {
  const v = round(valor);
  const isPagar = documento_tipo === "conta_pagar";

  // Validação: não permitir pagar mais que o saldo
  const total = Number(documento.valor) || 0;
  const jaPago = Number(isPagar ? documento.valor_pago : documento.valor_recebido) || 0;
  const saldo = round(total - jaPago);
  if (v <= 0) throw new Error("Valor deve ser maior que zero");
  if (v > saldo + 0.001) throw new Error(`Valor maior que o saldo restante (R$ ${saldo.toFixed(2)})`);

  let usuario_email;
  try {
    const u = await base44.auth.me();
    usuario_email = u?.email;
  } catch { /* ignore */ }

  // 1. Movimentação bancária
  const mov = await base44.entities.MovimentacaoBancaria.create({
    conta_bancaria_id,
    tipo: isPagar ? "debito" : "credito",
    data,
    valor: v,
    descricao: `Baixa: ${documento.descricao || documento.documento || "—"}`,
    loja_id: documento.loja_id,
    categoria_id: documento.categoria_id,
    centro_custo_id: documento.centro_custo_id,
    origem_tipo: documento_tipo,
    origem_id: documento.id,
    usuario_email,
  });

  // 2. Atualizar documento
  const novoPago = round(jaPago + v);
  let novoStatus;
  if (novoPago + 0.001 >= total) novoStatus = isPagar ? "paga" : "recebida";
  else if (novoPago > 0) novoStatus = "parcial";
  else novoStatus = "aberta";

  const patch = isPagar
    ? { valor_pago: novoPago, status: novoStatus, conta_bancaria_id, forma_pagamento_id, data_pagamento: data }
    : { valor_recebido: novoPago, status: novoStatus, conta_bancaria_id, forma_pagamento_id, data_recebimento: data };

  const Ent = isPagar ? base44.entities.ContaPagar : base44.entities.ContaReceber;
  await Ent.update(documento.id, patch);

  // 3. Registro de baixa
  const baixa = await base44.entities.BaixaFinanceira.create({
    documento_tipo,
    documento_id: documento.id,
    data,
    valor: v,
    conta_bancaria_id,
    forma_pagamento_id,
    loja_id: documento.loja_id,
    movimentacao_id: mov.id,
    observacoes,
    usuario_email,
  });

  // 4. Auditoria
  await registrarAuditoria({
    entidade: isPagar ? "ContaPagar" : "ContaReceber",
    entidade_id: documento.id,
    acao: "baixa",
    snapshot_antes: documento,
    snapshot_depois: { ...documento, ...patch },
    motivo: `Baixa de R$ ${v.toFixed(2)}`,
  });

  return { mov, baixa };
}

// --- Estorno de baixa ---
// Reverte uma baixa: marca como estornada, remove movimentação bancária,
// recalcula valor pago e status do documento, registra auditoria.
export async function estornarBaixa({ baixa, documento, documento_tipo, motivo }) {
  const isPagar = documento_tipo === "conta_pagar";
  if (baixa.estornada) throw new Error("Baixa já estornada");

  let usuario_email;
  try {
    const u = await base44.auth.me();
    usuario_email = u?.email;
  } catch { /* ignore */ }

  // 1. Remover movimentação bancária associada
  if (baixa.movimentacao_id) {
    try { await base44.entities.MovimentacaoBancaria.delete(baixa.movimentacao_id); } catch { /* ignore */ }
  }

  // 2. Marcar baixa como estornada
  await base44.entities.BaixaFinanceira.update(baixa.id, { estornada: true });

  // 3. Recalcular valor pago do documento
  const v = round(baixa.valor);
  const jaPago = Number(isPagar ? documento.valor_pago : documento.valor_recebido) || 0;
  const novoPago = round(Math.max(0, jaPago - v));
  const total = Number(documento.valor) || 0;
  let novoStatus;
  if (novoPago + 0.001 >= total && total > 0) novoStatus = isPagar ? "paga" : "recebida";
  else if (novoPago > 0) novoStatus = "parcial";
  else novoStatus = "aberta";

  const patch = isPagar
    ? { valor_pago: novoPago, status: novoStatus }
    : { valor_recebido: novoPago, status: novoStatus };

  const Ent = isPagar ? base44.entities.ContaPagar : base44.entities.ContaReceber;
  await Ent.update(documento.id, patch);

  // 4. Auditoria
  await registrarAuditoria({
    entidade: isPagar ? "ContaPagar" : "ContaReceber",
    entidade_id: documento.id,
    acao: "estorno_baixa",
    snapshot_antes: documento,
    snapshot_depois: { ...documento, ...patch },
    motivo: motivo || `Estorno de baixa de R$ ${v.toFixed(2)}`,
  });
}

// Lista baixas (não estornadas) de um documento, ordenadas por data
export async function listarBaixas(documento_id) {
  const all = await base44.entities.BaixaFinanceira.filter({ documento_id });
  return all.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
}

// --- Banco virtual: saldos por loja ---
// debito (origem→destino) cria saldo a receber em origem (loja deve para origem)
// credito faz o contrário
// liquidacao zera saldo
export function calcularSaldosVirtuais(lancamentos) {
  // Saldo positivo = a loja deve para o CD/origem
  const map = new Map();
  for (const l of lancamentos) {
    if (l.status === "cancelado") continue;
    const v = Number(l.valor) || 0;
    if (l.tipo === "debito") {
      // origem (CD) cobra destino (loja). destino fica devendo.
      bump(map, l.loja_destino_id, l.loja_origem_id, v);
    } else if (l.tipo === "credito") {
      // origem credita destino. destino "tem a receber" da origem (saldo negativo p/ destino).
      bump(map, l.loja_destino_id, l.loja_origem_id, -v);
    } else if (l.tipo === "liquidacao") {
      // liquidacao: destino paga origem (zera o débito). reduz saldo do destino.
      bump(map, l.loja_destino_id, l.loja_origem_id, -v);
    }
  }
  return map;
}

function bump(map, lojaA, lojaB, valor) {
  const key = `${lojaA}__${lojaB}`;
  const cur = map.get(key) || { loja_a: lojaA, loja_b: lojaB, saldo: 0 };
  cur.saldo = round(cur.saldo + valor);
  map.set(key, cur);
}

// Atualiza vencidos (status virtual): retorna documentos com status "vencida" calculado.
export function aplicarVencimento(docs) {
  const hoje = new Date().toISOString().slice(0, 10);
  return docs.map((d) => {
    if (d.status === "aberta" && d.data_vencimento && d.data_vencimento < hoje) {
      return { ...d, status: "vencida" };
    }
    return d;
  });
}

// Próximo número de cupom interno
export function gerarCupomNumero() {
  const d = new Date();
  return `CIC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-5)}`;
}