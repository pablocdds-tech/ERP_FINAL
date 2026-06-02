import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Serviço de integração com a API Aberta do Cardápio Web.
// Ações: testConnection, syncOrders. Token NUNCA é exposto ao frontend — lido apenas do secret.

const PROVIDER = 'cardapio_web';

function getToken() {
  return Deno.env.get('CARDAPIO_WEB_API_TOKEN') || '';
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

// Headers conforme a documentação do Cardápio Web: token no header X-API-KEY.
function buildHeaders(token) {
  return {
    'X-API-KEY': token,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Normaliza um pedido bruto do Cardápio Web para o formato external_orders.
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

// Upsert de pedido + itens. Retorna { created: bool }.
async function upsertOrder(sr, normalized, items) {
  const existing = (await sr.entities.external_orders.filter({ dedupe_key: normalized.dedupe_key }, '-created_date', 1))[0];
  let orderRecord;
  let created = false;
  if (existing) {
    await sr.entities.external_orders.update(existing.id, normalized);
    orderRecord = { ...existing, ...normalized };
    // Recria itens (substitui)
    const oldItems = await sr.entities.external_order_items.filter({ external_order_id: existing.id }, 'created_date', 500);
    for (const oi of oldItems) await sr.entities.external_order_items.delete(oi.id);
  } else {
    orderRecord = await sr.entities.external_orders.create(normalized);
    created = true;
  }
  for (const it of items) {
    await sr.entities.external_order_items.create({ ...it, external_order_id: orderRecord.id });
  }
  await upsertCustomer(sr, normalized, created);
  return { created, orderRecord };
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
      provider: PROVIDER,
      external_customer_id: phone,
      name: order.customer_name,
      phone,
      document: order.customer_document,
      address: order.delivery_address,
      neighborhood: order.neighborhood,
      last_order_at: order.ordered_at,
      total_orders: 1,
      total_spent: num(order.total_amount),
    });
  }
}

async function fetchOrdersFromApi(integration, token, since) {
  const base = normalizeBaseUrl(integration.base_url);
  if (!base) throw new Error('Base URL da API não configurada.');
  const code = encodeURIComponent(integration.external_store_code || '');
  const sinceQs = since ? `&since=${encodeURIComponent(since)}` : '';
  // Endpoint padrão — ajustável conforme a documentação do Cardápio Web.
  const url = `${base}/orders?store=${code}${sinceQs}`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  const text = await resp.text();
  if (resp.status === 401) throw new Error('Token inválido ou não informado (HTTP 401).');
  if (resp.status === 404) throw new Error(`Endpoint não encontrado (HTTP 404). URL chamada: ${url}`);
  if (resp.status === 429) throw new Error('Limite de requisições atingido (HTTP 429). Tente novamente em instantes.');
  if (!resp.ok) throw new Error(`Falha na conexão (HTTP ${resp.status}). Resposta: ${text.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Resposta da API não é um JSON válido (HTTP ${resp.status}). Conteúdo recebido: ${text.slice(0, 300)}`); }
  const orders = data.orders || data.pedidos || data.data || (Array.isArray(data) ? data : []);
  return { orders: Array.isArray(orders) ? orders : [], raw: text.slice(0, 20000) };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });

    const sr = base44.asServiceRole;
    const { action, integration_id, since } = await req.json();
    if (!integration_id) return Response.json({ error: 'integration_id é obrigatório.' }, { status: 400 });

    const integration = (await sr.entities.integrations.filter({ id: integration_id }))[0];
    if (!integration) return Response.json({ error: 'Integração não encontrada.' }, { status: 404 });

    const token = getToken();
    if (!token) return Response.json({ error: 'Token da API não está configurado no servidor.' }, { status: 400 });

    if (action === 'testConnection') {
      const { orders, raw } = await fetchOrdersFromApi(integration, token, since);
      await sr.entities.integration_sync_logs.create({
        integration_id, provider: PROVIDER, status: orders.length ? 'sucesso' : 'vazio',
        started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
        records_received: orders.length, raw_response: raw,
      });
      return Response.json({ ok: true, message: `Conexão OK. ${orders.length} pedido(s) disponíveis.`, count: orders.length });
    }

    if (action === 'syncOrders') {
      const startedAt = new Date().toISOString();
      const log = await sr.entities.integration_sync_logs.create({
        integration_id, provider: PROVIDER, status: 'iniciado', started_at: startedAt,
      });
      try {
        const { orders, raw } = await fetchOrdersFromApi(integration, token, since);
        let created = 0, updated = 0;
        for (const raw_order of orders) {
          const normalized = normalizeOrderPayload(raw_order, integration);
          if (!normalized.external_order_id) continue;
          const items = normalizeItems(raw_order);
          const res = await upsertOrder(sr, normalized, items);
          if (res.created) created++; else updated++;
        }
        const finishedAt = new Date().toISOString();
        await sr.entities.integration_sync_logs.update(log.id, {
          status: orders.length ? 'sucesso' : 'vazio', finished_at: finishedAt,
          records_received: orders.length, records_created: created, records_updated: updated,
          raw_response: raw,
        });
        await sr.entities.integrations.update(integration_id, { last_sync_at: finishedAt });
        return Response.json({ ok: true, message: `Sincronização concluída. ${created} novo(s), ${updated} atualizado(s).`, created, updated, received: orders.length });
      } catch (err) {
        await sr.entities.integration_sync_logs.update(log.id, {
          status: 'erro', finished_at: new Date().toISOString(), error_message: err.message,
        });
        return Response.json({ error: err.message }, { status: 502 });
      }
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});