import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Endpoint público de webhook do Cardápio Web.
// Identifica a integração por webhook_secret (query/header/body) ou external_store_code,
// salva o evento bruto e processa o pedido (upsert) com prevenção de duplicidade.
// Se o payload for básico (só ID), busca o detalhe completo via API oficial.

const PROVIDER = 'cardapio_web';

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function getApiToken() {
  const env = Deno.env.toObject();
  return env['CARDAPIO_WEB_API_KEY'] || env['CARDAPIO_WEB_API_TOKEN'] || '';
}

function normalizeBaseUrl(url) { return String(url || '').replace(/\/+$/, ''); }

// Extrai o ID do pedido em vários formatos possíveis (raiz, order.*, data.*).
function extractOrderId(body) {
  const o = body.order || {};
  const d = body.data || {};
  return String(
    body.order_id || body.id || body.pedido_id || body.codigo ||
    o.id || o.order_id || d.id || d.order_id || ''
  );
}

function normalizeOrderPayload(raw, integration) {
  const customer = raw.customer || raw.cliente || {};
  const address = raw.delivery_address || raw.endereco || customer.address || {};
  const externalOrderId = String(raw.id || raw.order_id || raw.pedido_id || raw.codigo || '');
  return {
    store_id: integration.store_id || '',
    provider: PROVIDER,
    external_store_code: integration.external_store_code || String(raw.merchant_id || ''),
    external_order_id: externalOrderId,
    order_number: String(raw.display_id || raw.order_number || raw.numero || raw.number || externalOrderId),
    status: String(raw.status || raw.situacao || 'waiting_confirmation'),
    customer_name: customer.name || customer.nome || raw.customer_name || '',
    customer_phone: String(customer.phone || customer.telefone || raw.customer_phone || ''),
    customer_document: customer.document || customer.documento || customer.cpf || (raw.fiscal_document || ''),
    delivery_address: typeof address === 'string' ? address : (address.full || address.formatted_address || address.logradouro || address.street || ''),
    neighborhood: (typeof address === 'object' ? (address.neighborhood || address.bairro) : '') || '',
    subtotal: num(raw.subtotal ?? raw.sub_total),
    delivery_fee: num(raw.delivery_fee ?? raw.taxa_entrega ?? raw.frete),
    discount: num(raw.discount ?? raw.desconto ?? (Array.isArray(raw.discounts) ? raw.discounts.reduce((s, d) => s + num(d.value ?? d.amount), 0) : 0)),
    total_amount: num(raw.total ?? raw.total_amount ?? raw.valor_total),
    payment_method: raw.payment_method || raw.forma_pagamento || raw.pagamento || (Array.isArray(raw.payments) && raw.payments[0] ? (raw.payments[0].method || raw.payments[0].name || raw.payments[0].type) : '') || '',
    sales_channel: raw.sales_channel || raw.canal || 'cardapio_web',
    ordered_at: raw.created_at || raw.data_pedido || raw.ordered_at || new Date().toISOString(),
    raw_payload: JSON.stringify(raw).slice(0, 30000),
    dedupe_key: `${PROVIDER}|${integration.external_store_code || raw.merchant_id || ''}|${externalOrderId}`,
  };
}

// Extrai os complementos/sabores/bordas (options) de um item, agrupando por grupo.
function extractOptions(it) {
  const opts = it.options || it.complementos || it.adicionais || it.modifiers || [];
  if (!Array.isArray(opts) || opts.length === 0) return [];
  return opts.map((op) => ({
    grupo: op.option_group_name || op.group_name || op.grupo || '',
    nome: op.name || op.nome || '',
    quantidade: num(op.quantity ?? op.quantidade ?? 1),
    preco: num(op.unit_price ?? op.price ?? op.valor),
  })).filter((o) => o.nome);
}

// Monta um texto legível com sabores/complementos + observação do cliente.
function buildItemNotes(it, options) {
  const partes = [];
  const obs = it.notes || it.observacao || it.obs || it.observation || '';
  if (Array.isArray(options) && options.length > 0) {
    // Agrupa por nome de grupo (ex: "Escolha seu sabor: CALABRESA, OVOMALTINE")
    const porGrupo = {};
    for (const o of options) {
      const g = o.grupo || 'Complementos';
      (porGrupo[g] = porGrupo[g] || []).push(o.quantidade > 1 ? `${o.quantidade}x ${o.nome}` : o.nome);
    }
    for (const [g, lista] of Object.entries(porGrupo)) {
      partes.push(`${g}: ${lista.join(', ')}`);
    }
  }
  if (obs) partes.push(`Obs: ${obs}`);
  return partes.join(' | ');
}

function normalizeItems(raw) {
  const items = raw.items || raw.itens || raw.produtos || [];
  return (Array.isArray(items) ? items : []).map((it) => {
    const options = extractOptions(it);
    const optionsTotal = options.reduce((s, o) => s + o.preco * (o.quantidade || 1), 0);
    const baseTotal = num(it.total_price ?? it.valor_total ?? it.total);
    return {
      external_product_id: String(it.product_id || it.id || it.produto_id || ''),
      product_name: it.name || it.nome || it.product_name || it.descricao || '',
      category_name: it.category || it.categoria || it.category_name || '',
      quantity: num(it.quantity ?? it.quantidade ?? it.qtd ?? 1),
      unit_price: num(it.unit_price ?? it.valor_unitario ?? it.preco ?? it.price),
      // Quando o item base vem com preço 0 (pizza só com sabores), usa a soma dos options.
      total_price: baseTotal > 0 ? baseTotal : optionsTotal,
      notes: buildItemNotes(it, options),
      options,
      raw_payload: JSON.stringify(it).slice(0, 8000),
    };
  });
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

// Busca o detalhe completo do pedido na API oficial (quando o webhook só envia o ID).
async function fetchOrderDetail(integration, orderId) {
  const token = getApiToken();
  const base = normalizeBaseUrl(integration.base_url);
  if (!token || !base) return null;
  const url = `${base}/api/partner/v1/orders/${encodeURIComponent(orderId)}`;
  const resp = await fetch(url, { headers: { 'X-API-KEY': token, 'Accept': 'application/json' } });
  if (!resp.ok) return null;
  const text = await resp.text();
  try { const data = JSON.parse(text); return data.order || data.data || data; } catch { return null; }
}

// Considera o payload "básico" se não tiver itens nem totais (provável webhook só com ID/status).
function isBasicPayload(raw) {
  const hasItems = Array.isArray(raw.items || raw.itens || raw.produtos) && (raw.items || raw.itens || raw.produtos).length > 0;
  const hasTotal = num(raw.total ?? raw.total_amount ?? raw.valor_total) > 0;
  return !hasItems && !hasTotal;
}

async function processOrder(sr, body, integration) {
  // Pega o objeto do pedido onde estiver
  let orderRaw = body.order || body.pedido || body.data || body;
  const orderId = extractOrderId(body);

  // Se o payload é básico mas temos um ID, busca o detalhe completo via API.
  if (orderId && isBasicPayload(orderRaw)) {
    const detail = await fetchOrderDetail(integration, orderId);
    if (detail) orderRaw = detail;
  }

  const normalized = normalizeOrderPayload(orderRaw, integration);
  if (!normalized.external_order_id && orderId) normalized.external_order_id = orderId;
  if (!normalized.external_order_id) throw new Error('Pedido sem identificador.');
  if (!normalized.dedupe_key.endsWith(`|${normalized.external_order_id}`)) {
    normalized.dedupe_key = `${PROVIDER}|${integration.external_store_code || ''}|${normalized.external_order_id}`;
  }

  const items = normalizeItems(orderRaw);
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
  for (const it of items) {
    const { options: _opts, ...itemData } = it;
    await sr.entities.external_order_items.create({ ...itemData, external_order_id: orderRecord.id });
  }
  await upsertCustomer(sr, normalized, isNew);
  return { orderRecord, externalId: normalized.external_order_id };
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

  // Secret: query string > header X-Webhook-Secret > body (fallback)
  const urlObj = new URL(req.url);
  const secret = urlObj.searchParams.get('secret') || req.headers.get('x-webhook-secret') || body.webhook_secret || '';
  const storeCode = urlObj.searchParams.get('store') || body.store_code || body.external_store_code || body.store || body.merchant_id || '';

  let integration = null;
  if (secret) integration = (await sr.entities.integrations.filter({ webhook_secret: secret }))[0];
  if (!integration && storeCode) integration = (await sr.entities.integrations.filter({ external_store_code: String(storeCode) }))[0];

  const eventBase = {
    integration_id: integration?.id || '',
    provider: PROVIDER,
    event_type: body.event || body.type || body.evento || 'order',
    external_id: extractOrderId(body),
    raw_payload: JSON.stringify(body).slice(0, 30000),
    status: 'recebido',
  };

  // Sem secret válido → registra erro (se possível) e retorna 401.
  if (!integration) {
    await sr.entities.integration_webhook_events.create({ ...eventBase, status: 'erro', error_message: 'Secret inválido — integração não identificada (secret/loja).' });
    return Response.json({ error: 'Secret inválido ou integração não identificada.' }, { status: 401 });
  }
  if (integration.active === false) {
    await sr.entities.integration_webhook_events.create({ ...eventBase, status: 'ignorado', error_message: 'Integração inativa.' });
    return Response.json({ ok: true, ignored: true });
  }

  // Salva sempre o evento bruto (auditoria) antes de processar.
  const evt = await sr.entities.integration_webhook_events.create(eventBase);

  try {
    const { externalId } = await processOrder(sr, body, integration);
    await sr.entities.integration_webhook_events.update(evt.id, {
      status: 'processado', external_id: externalId || eventBase.external_id, processed_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, message: 'Webhook recebido e processado.' });
  } catch (err) {
    // Payload já está salvo → retorna 200 com warning e registra o erro no evento.
    await sr.entities.integration_webhook_events.update(evt.id, { status: 'erro', error_message: err.message, processed_at: new Date().toISOString() });
    return Response.json({ ok: true, message: 'Webhook recebido; processamento pendente.', warning: err.message });
  }
});