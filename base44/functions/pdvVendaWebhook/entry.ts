import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Webhook genérico para receber vendas do PDV.
// Autenticação: token secreto fixo enviado em ?secret=, header X-Webhook-Secret, ou body.secret.
// Aceita PDV_WEBHOOK_SECRET; se não existir, cai para WHATSAPP_WEBHOOK_SECRET.
// Registra SEMPRE o evento bruto (auditoria) e grava a venda em external_orders + itens.
// Objetivo: "saber como entrou cada venda" — payload bruto + dados normalizados.

const PROVIDER = 'pdv';

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function getExpectedSecret() {
  const env = Deno.env.toObject();
  return env['PDV_WEBHOOK_SECRET'] || env['WHATSAPP_WEBHOOK_SECRET'] || '';
}

// Extrai o ID da venda em vários formatos possíveis.
function extractOrderId(body) {
  const o = body.order || body.venda || body.pedido || {};
  const d = body.data || {};
  return String(
    body.order_id || body.venda_id || body.pedido_id || body.id || body.codigo ||
    o.id || o.order_id || o.codigo || d.id || d.order_id || ''
  );
}

function normalizeOrder(raw, externalId) {
  const customer = raw.customer || raw.cliente || {};
  const address = raw.delivery_address || raw.endereco || customer.address || {};
  return {
    provider: PROVIDER,
    external_store_code: String(raw.store_code || raw.loja || raw.merchant_id || ''),
    external_order_id: externalId,
    order_number: String(raw.display_id || raw.order_number || raw.numero || raw.number || externalId),
    status: String(raw.status || raw.situacao || 'concluido'),
    customer_name: customer.name || customer.nome || raw.customer_name || raw.cliente_nome || '',
    customer_phone: String(customer.phone || customer.telefone || raw.customer_phone || raw.cliente_telefone || ''),
    customer_document: customer.document || customer.documento || customer.cpf || raw.fiscal_document || '',
    delivery_address: typeof address === 'string' ? address : (address.full || address.formatted_address || address.logradouro || address.street || ''),
    neighborhood: (typeof address === 'object' ? (address.neighborhood || address.bairro) : '') || '',
    subtotal: num(raw.subtotal ?? raw.sub_total),
    delivery_fee: num(raw.delivery_fee ?? raw.taxa_entrega ?? raw.frete),
    discount: num(raw.discount ?? raw.desconto),
    total_amount: num(raw.total ?? raw.total_amount ?? raw.valor_total),
    payment_method: raw.payment_method || raw.forma_pagamento || raw.pagamento || (Array.isArray(raw.payments) && raw.payments[0] ? (raw.payments[0].method || raw.payments[0].name || raw.payments[0].type) : '') || '',
    sales_channel: raw.sales_channel || raw.canal || 'pdv',
    ordered_at: raw.created_at || raw.data_venda || raw.ordered_at || new Date().toISOString(),
    raw_payload: JSON.stringify(raw).slice(0, 30000),
    dedupe_key: `${PROVIDER}|${String(raw.store_code || raw.loja || '')}|${externalId}`,
  };
}

function normalizeItems(raw) {
  const items = raw.items || raw.itens || raw.produtos || [];
  return (Array.isArray(items) ? items : []).map((it) => ({
    external_product_id: String(it.product_id || it.id || it.produto_id || ''),
    product_name: it.name || it.nome || it.product_name || it.descricao || '',
    category_name: it.category || it.categoria || it.category_name || '',
    quantity: num(it.quantity ?? it.quantidade ?? it.qtd ?? 1),
    unit_price: num(it.unit_price ?? it.valor_unitario ?? it.preco ?? it.price),
    total_price: num(it.total_price ?? it.valor_total ?? it.total),
    notes: it.notes || it.observacao || it.obs || '',
    raw_payload: JSON.stringify(it).slice(0, 8000),
  }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });

  let sr;
  try {
    const base44 = createClientFromRequest(req);
    sr = base44.asServiceRole;
  } catch {
    return Response.json({ error: 'init' }, { status: 500 });
  }

  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  // Lê o token de vários lugares: query (?secret=), header X-Webhook-Secret,
  // header Authorization (Bearer TOKEN ou só o token), ou body.
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  const urlObj = new URL(req.url);
  const secret = urlObj.searchParams.get('secret') || req.headers.get('x-webhook-secret') || bearer || body.secret || body.webhook_secret || '';
  const expected = getExpectedSecret();

  const eventBase = {
    integration_id: '',
    provider: PROVIDER,
    event_type: body.event || body.type || body.evento || 'venda',
    external_id: extractOrderId(body),
    raw_payload: JSON.stringify(body).slice(0, 30000),
    status: 'recebido',
  };

  // Autenticação por token fixo.
  if (!expected || secret !== expected) {
    await sr.entities.integration_webhook_events.create({ ...eventBase, status: 'erro', error_message: 'Token de segurança inválido.' });
    return Response.json({ error: 'Token de segurança inválido.' }, { status: 401 });
  }

  // Salva o evento bruto (auditoria) antes de processar.
  const evt = await sr.entities.integration_webhook_events.create(eventBase);

  try {
    const orderRaw = body.order || body.venda || body.pedido || body.data || body;
    const externalId = extractOrderId(body) || extractOrderId(orderRaw);
    if (!externalId) throw new Error('Venda sem identificador (id/codigo).');

    const normalized = normalizeOrder(orderRaw, externalId);
    const items = normalizeItems(orderRaw);

    const existing = (await sr.entities.external_orders.filter({ dedupe_key: normalized.dedupe_key }, '-created_date', 1))[0];
    let orderRecord;
    if (existing) {
      await sr.entities.external_orders.update(existing.id, normalized);
      orderRecord = existing;
      const oldItems = await sr.entities.external_order_items.filter({ external_order_id: existing.id }, 'created_date', 500);
      for (const oi of oldItems) await sr.entities.external_order_items.delete(oi.id);
    } else {
      orderRecord = await sr.entities.external_orders.create(normalized);
    }
    for (const it of items) {
      await sr.entities.external_order_items.create({ ...it, external_order_id: orderRecord.id });
    }

    await sr.entities.integration_webhook_events.update(evt.id, {
      status: 'processado', external_id: externalId, processed_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, message: 'Venda recebida e registrada.', external_order_id: externalId });
  } catch (err) {
    await sr.entities.integration_webhook_events.update(evt.id, { status: 'erro', error_message: err.message, processed_at: new Date().toISOString() });
    return Response.json({ ok: true, message: 'Venda recebida; processamento pendente.', warning: err.message });
  }
});