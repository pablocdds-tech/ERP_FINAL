import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público de webhook do Cardápio Web.
// Identifica a integração por webhook_secret (query/header/body) ou external_store_code,
// salva o evento bruto e processa o pedido (upsert) com prevenção de duplicidade.

const PROVIDER = 'cardapio_web';

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function normalizeOrderPayload(raw, integration) {
  const customer = raw.customer || raw.cliente || {};
  const address = raw.delivery_address || raw.endereco || customer.address || {};
  const externalOrderId = String(raw.id || raw.order_id || raw.pedido_id || raw.codigo || '');
  return {
    store_id: integration.store_id || '',
    provider: PROVIDER,
    external_store_code: integration.external_store_code || '',
    external_order_id: externalOrderId,
    order_number: String(raw.order_number || raw.numero || raw.number || externalOrderId),
    status: String(raw.status || raw.situacao || 'recebido'),
    customer_name: customer.name || customer.nome || raw.customer_name || '',
    customer_phone: String(customer.phone || customer.telefone || raw.customer_phone || ''),
    customer_document: customer.document || customer.documento || customer.cpf || '',
    delivery_address: typeof address === 'string' ? address : (address.full || address.logradouro || address.street || ''),
    neighborhood: (typeof address === 'object' ? (address.neighborhood || address.bairro) : '') || '',
    subtotal: num(raw.subtotal ?? raw.sub_total),
    delivery_fee: num(raw.delivery_fee ?? raw.taxa_entrega ?? raw.frete),
    discount: num(raw.discount ?? raw.desconto),
    total_amount: num(raw.total ?? raw.total_amount ?? raw.valor_total),
    payment_method: raw.payment_method || raw.forma_pagamento || raw.pagamento || '',
    sales_channel: raw.sales_channel || raw.canal || 'cardapio_web',
    ordered_at: raw.created_at || raw.data_pedido || raw.ordered_at || new Date().toISOString(),
    raw_payload: JSON.stringify(raw).slice(0, 30000),
    dedupe_key: `${PROVIDER}|${integration.external_store_code || ''}|${externalOrderId}`,
  };
}

function normalizeItems(raw) {
  const items = raw.items || raw.itens || raw.produtos || [];
  return (Array.isArray(items) ? items : []).map((it) => ({
    external_product_id: String(it.product_id || it.id || it.produto_id || ''),
    product_name: it.name || it.nome || it.product_name || it.descricao || '',
    category_name: it.category || it.categoria || it.category_name || '',
    quantity: num(it.quantity ?? it.quantidade ?? it.qtd ?? 1),
    unit_price: num(it.unit_price ?? it.valor_unitario ?? it.preco),
    total_price: num(it.total_price ?? it.valor_total ?? it.total),
    notes: it.notes || it.observacao || it.obs || '',
    raw_payload: JSON.stringify(it).slice(0, 8000),
  }));
}

async function upsertCustomer(sr, order, isNew) {
  const phone = order.customer_phone;
  if (!phone) return;
  const existing = (await sr.entities.external_customers.filter({ provider: PROVIDER, phone }, '-created_date', 1))[0];
  if (existing) {
    await sr.entities.external_customers.update(existing.id, {
      name: order.customer_name || existing.name,
      document: order.customer_document || existing.document,
      address: order.delivery_address || existing.address,
      neighborhood: order.neighborhood || existing.neighborhood,
      last_order_at: order.ordered_at,
      // Só acumula contadores quando o pedido é novo (evita inflar em re-envios/updates)
      total_orders: num(existing.total_orders) + (isNew ? 1 : 0),
      total_spent: num(existing.total_spent) + (isNew ? num(order.total_amount) : 0),
    });
  } else {
    await sr.entities.external_customers.create({
      provider: PROVIDER, external_customer_id: phone, name: order.customer_name, phone,
      document: order.customer_document, address: order.delivery_address, neighborhood: order.neighborhood,
      last_order_at: order.ordered_at, total_orders: 1, total_spent: num(order.total_amount),
    });
  }
}

async function processOrder(sr, raw, integration) {
  const normalized = normalizeOrderPayload(raw, integration);
  if (!normalized.external_order_id) throw new Error('Pedido sem identificador.');
  const items = normalizeItems(raw);
  const existing = (await sr.entities.external_orders.filter({ dedupe_key: normalized.dedupe_key }, '-created_date', 1))[0];
  let orderRecord;
  const isNew = !existing;
  if (existing) {
    await sr.entities.external_orders.update(existing.id, normalized);
    orderRecord = existing;
    const oldItems = await sr.entities.external_order_items.filter({ external_order_id: existing.id }, 'created_date', 500);
    for (const oi of oldItems) await sr.entities.external_order_items.delete(oi.id);
  } else {
    orderRecord = await sr.entities.external_orders.create(normalized);
  }
  for (const it of items) await sr.entities.external_order_items.create({ ...it, external_order_id: orderRecord.id });
  await upsertCustomer(sr, normalized, isNew);
  return orderRecord;
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

  // Identificação da integração: secret (query/header/body) ou código da loja
  const urlObj = new URL(req.url);
  const secret = urlObj.searchParams.get('secret') || req.headers.get('x-webhook-secret') || body.webhook_secret || '';
  const storeCode = urlObj.searchParams.get('store') || body.store_code || body.external_store_code || body.store || '';

  let integration = null;
  if (secret) integration = (await sr.entities.integrations.filter({ webhook_secret: secret }))[0];
  if (!integration && storeCode) integration = (await sr.entities.integrations.filter({ external_store_code: String(storeCode) }))[0];

  // Registra o evento bruto SEMPRE (auditoria), mesmo se a integração não for identificada
  const eventBase = {
    integration_id: integration?.id || '',
    provider: PROVIDER,
    event_type: body.event || body.type || body.evento || 'order',
    external_id: String(body.id || body.order_id || body.pedido_id || ''),
    raw_payload: JSON.stringify(body).slice(0, 30000),
    status: 'recebido',
  };

  if (!integration) {
    await sr.entities.integration_webhook_events.create({ ...eventBase, status: 'erro', error_message: 'Integração não identificada (secret/loja inválidos).' });
    return Response.json({ error: 'Integração não identificada.' }, { status: 401 });
  }
  if (integration.active === false) {
    await sr.entities.integration_webhook_events.create({ ...eventBase, status: 'ignorado', error_message: 'Integração inativa.' });
    return Response.json({ ok: true, ignored: true });
  }

  const evt = await sr.entities.integration_webhook_events.create(eventBase);

  // Processa o pedido. Responde rápido — payload já está salvo.
  try {
    const orderRaw = body.order || body.pedido || body.data || body;
    await processOrder(sr, orderRaw, integration);
    await sr.entities.integration_webhook_events.update(evt.id, { status: 'processado', processed_at: new Date().toISOString() });
    return Response.json({ ok: true, message: 'Webhook recebido e processado.' });
  } catch (err) {
    await sr.entities.integration_webhook_events.update(evt.id, { status: 'erro', error_message: err.message, processed_at: new Date().toISOString() });
    return Response.json({ ok: true, message: 'Webhook recebido; processamento pendente.', warning: err.message });
  }
});