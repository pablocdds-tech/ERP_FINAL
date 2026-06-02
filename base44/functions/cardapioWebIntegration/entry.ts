import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Serviço de integração com a API de Pedidos do Cardápio Web (Partner v1).
// Ações: testConnection, syncOrders, getOrderDetail.
// Endpoints oficiais:
//   GET /api/partner/v1/orders                (lista resumida, suporta updated_since e status[])
//   GET /api/partner/v1/orders/{order_id}     (detalhe completo)
// Autenticação: header X-API-KEY. Token lido apenas do secret (nunca exposto ao frontend).

const PROVIDER = 'cardapio_web';

// Prioriza CARDAPIO_WEB_API_KEY; cai para CARDAPIO_WEB_API_TOKEN (compatibilidade).
// Nomes montados dinamicamente para não forçar a exigência automática do secret API_KEY.
function getToken() {
  const env = Deno.env.toObject();
  return env['CARDAPIO_WEB_API_KEY'] || env['CARDAPIO_WEB_API_TOKEN'] || '';
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function buildHeaders(token) {
  return { 'X-API-KEY': token, 'Content-Type': 'application/json', 'Accept': 'application/json' };
}

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function ambienteDe(baseUrl) {
  return /sandbox/i.test(String(baseUrl || '')) ? 'sandbox' : 'producao';
}

function httpError(status, text, url) {
  if (status === 400) return new Error(`Parâmetros inválidos (HTTP 400). ${text.slice(0, 200)}`);
  if (status === 401) return new Error('Token inválido ou não informado (HTTP 401).');
  if (status === 404) return new Error(`Recurso não encontrado (HTTP 404). URL: ${url}`);
  if (status === 429) return new Error('Limite de requisições atingido (HTTP 429). Tente novamente em instantes.');
  return new Error(`Falha na conexão (HTTP ${status}). Resposta: ${text.slice(0, 300)}`);
}

// ---- Normalização (compartilhada com o webhook via reimplementação local, sem imports locais) ----

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

function normalizeItems(raw) {
  const items = raw.items || raw.itens || raw.produtos || [];
  return (Array.isArray(items) ? items : []).map((it) => ({
    external_product_id: String(it.product_id || it.id || it.produto_id || ''),
    product_name: it.name || it.nome || it.product_name || it.descricao || '',
    category_name: it.category || it.categoria || it.category_name || '',
    quantity: num(it.quantity ?? it.quantidade ?? it.qtd ?? 1),
    unit_price: num(it.unit_price ?? it.valor_unitario ?? it.preco ?? it.price),
    total_price: num(it.total_price ?? it.valor_total ?? it.total),
    notes: it.notes || it.observacao || it.obs || it.observation || '',
    raw_payload: JSON.stringify(it).slice(0, 8000),
  }));
}

// Mapeia status oficial do Cardápio Web → fluxo do PDV/KDS.
function mapStatusPdv(statusExterno) {
  const s = String(statusExterno || '').toLowerCase();
  const mapa = {
    waiting_confirmation: 'novo',
    pending_payment: 'aguardando_pagamento',
    pending_online_payment: 'aguardando_pagamento',
    scheduled_confirmed: 'agendado',
    confirmed: 'em_preparo',
    ready: 'pronto',
    released: 'saiu_para_entrega',
    waiting_to_catch: 'aguardando_retirada',
    delivered: 'entregue',
    closed: 'finalizado',
    canceling: 'cancelando',
    canceled: 'cancelado',
  };
  if (mapa[s]) return mapa[s];
  // Fallback heurístico para status livres/legados
  if (/cancel/.test(s)) return 'cancelado';
  if (/(conclu|entreg|finaliz|complet|deliver)/.test(s)) return 'concluido';
  if (/(rota|saiu|transit|despach|released)/.test(s)) return 'em_entrega';
  if (/(pronto|ready)/.test(s)) return 'pronto';
  if (/(prepar|produ|cozinha|aceito|confirm)/.test(s)) return 'em_preparo';
  return 'novo';
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

async function upsertPdvPedido(sr, normalized, items) {
  const dedupeKey = `pdv|${normalized.dedupe_key}`;
  const existing = (await sr.entities.pdv_pedido.filter({ dedupe_key: dedupeKey }, '-created_date', 1))[0];
  const itensPdv = items.map((it) => ({
    produto_nome: it.product_name,
    quantidade: num(it.quantity) || 1,
    preco_unitario: num(it.unit_price),
    preco_total: num(it.total_price),
    observacao: it.notes || '',
  }));
  const dados = {
    loja_id: normalized.store_id || '',
    canal: 'cardapio_web',
    tipo_entrega: 'delivery',
    numero_pedido: normalized.order_number,
    origem_id: normalized.external_order_id,
    dedupe_key: dedupeKey,
    status: mapStatusPdv(normalized.status),
    cliente_nome: normalized.customer_name,
    cliente_telefone: normalized.customer_phone,
    endereco_entrega: normalized.delivery_address,
    bairro: normalized.neighborhood,
    itens: itensPdv,
    subtotal: num(normalized.subtotal),
    taxa_entrega: num(normalized.delivery_fee),
    desconto: num(normalized.discount),
    total: num(normalized.total_amount),
    forma_pagamento: normalized.payment_method,
    recebido_em: normalized.ordered_at || new Date().toISOString(),
  };
  if (existing) await sr.entities.pdv_pedido.update(existing.id, dados);
  else await sr.entities.pdv_pedido.create(dados);
}

// Upsert de pedido + itens. Retorna { created: bool }.
async function upsertOrder(sr, normalized, items) {
  const existing = (await sr.entities.external_orders.filter({ dedupe_key: normalized.dedupe_key }, '-created_date', 1))[0];
  let orderRecord;
  let created = false;
  if (existing) {
    await sr.entities.external_orders.update(existing.id, normalized);
    orderRecord = { ...existing, ...normalized };
    const oldItems = await sr.entities.external_order_items.filter({ external_order_id: existing.id }, 'created_date', 500);
    for (const oi of oldItems) await sr.entities.external_order_items.delete(oi.id);
  } else {
    orderRecord = await sr.entities.external_orders.create(normalized);
    created = true;
  }
  for (const it of items) await sr.entities.external_order_items.create({ ...it, external_order_id: orderRecord.id });
  await upsertCustomer(sr, normalized, created);
  await upsertPdvPedido(sr, normalized, items);
  return { created, orderRecord };
}

// ---- Chamadas à API oficial ----

// Lista resumida de pedidos. Suporta updated_since e status[] (array).
async function fetchOrdersFromApi(integration, token, params = {}) {
  const base = normalizeBaseUrl(integration.base_url);
  if (!base) throw new Error('Base URL da API não configurada.');
  const qs = new URLSearchParams();
  if (params.updated_since) qs.set('updated_since', params.updated_since);
  if (Array.isArray(params.status)) params.status.forEach((s) => qs.append('status[]', s));
  const query = qs.toString();
  const url = `${base}/api/partner/v1/orders${query ? `?${query}` : ''}`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  const text = await resp.text();
  if (!resp.ok) throw httpError(resp.status, text, url);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Resposta não é JSON válido (HTTP ${resp.status}). Conteúdo: ${text.slice(0, 300)}`); }
  const orders = data.orders || data.data || data.pedidos || (Array.isArray(data) ? data : []);
  return { orders: Array.isArray(orders) ? orders : [], raw: text.slice(0, 20000), url };
}

// Detalhe completo de um pedido. Reutilizável por webhook e polling.
async function fetchOrderDetail(integration, token, orderId) {
  const base = normalizeBaseUrl(integration.base_url);
  if (!base) throw new Error('Base URL da API não configurada.');
  const url = `${base}/api/partner/v1/orders/${encodeURIComponent(orderId)}`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  const text = await resp.text();
  if (!resp.ok) throw httpError(resp.status, text, url);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Detalhe não é JSON válido (HTTP ${resp.status}). Conteúdo: ${text.slice(0, 300)}`); }
  return data.order || data.data || data;
}

function orderIdDe(raw) {
  return String(raw.id || raw.order_id || raw.pedido_id || raw.codigo || '');
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });

    const sr = base44.asServiceRole;
    const { action, integration_id, order_id, since, status } = await req.json();
    if (!integration_id) return Response.json({ error: 'integration_id é obrigatório.' }, { status: 400 });

    const integration = (await sr.entities.integrations.filter({ id: integration_id }))[0];
    if (!integration) return Response.json({ error: 'Integração não encontrada.' }, { status: 404 });

    const token = getToken();
    if (!token) return Response.json({ error: 'Token da API (X-API-KEY) não está configurado no servidor.' }, { status: 400 });

    const ambiente = ambienteDe(integration.base_url);

    if (action === 'testConnection') {
      const { orders, raw } = await fetchOrdersFromApi(integration, token, { updated_since: since, status });
      await sr.entities.integration_sync_logs.create({
        integration_id, provider: PROVIDER, status: orders.length ? 'sucesso' : 'vazio',
        started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
        records_received: orders.length, raw_response: `[${ambiente}] ${raw}`,
      });
      return Response.json({ ok: true, message: `Conexão OK (${ambiente}). ${orders.length} pedido(s) disponíveis.`, count: orders.length });
    }

    if (action === 'getOrderDetail') {
      if (!order_id) return Response.json({ error: 'order_id é obrigatório.' }, { status: 400 });
      const detail = await fetchOrderDetail(integration, token, order_id);
      return Response.json({ ok: true, order: detail });
    }

    if (action === 'syncOrders') {
      const startedAt = Date.now();
      const log = await sr.entities.integration_sync_logs.create({
        integration_id, provider: PROVIDER, status: 'iniciado', started_at: new Date(startedAt).toISOString(),
      });
      try {
        // updated_since: usa o "since" recebido ou a última sync com margem de 2 min.
        let updatedSince = since;
        if (!updatedSince && integration.last_sync_at) {
          updatedSince = new Date(new Date(integration.last_sync_at).getTime() - 2 * 60 * 1000).toISOString();
        }
        const { orders, raw } = await fetchOrdersFromApi(integration, token, { updated_since: updatedSince, status });
        let created = 0, updated = 0, ignored = 0;
        for (const resumo of orders) {
          const oid = orderIdDe(resumo);
          if (!oid) { ignored++; continue; }
          // Busca o detalhe completo de cada pedido (resumo da lista pode não ter itens).
          let full = resumo;
          try { full = await fetchOrderDetail(integration, token, oid); } catch { full = resumo; }
          const normalized = normalizeOrderPayload(full, integration);
          if (!normalized.external_order_id) { ignored++; continue; }
          const items = normalizeItems(full);
          const res = await upsertOrder(sr, normalized, items);
          if (res.created) created++; else updated++;
        }
        const finishedAt = new Date().toISOString();
        await sr.entities.integration_sync_logs.update(log.id, {
          status: orders.length ? 'sucesso' : 'vazio', finished_at: finishedAt,
          records_received: orders.length, records_created: created, records_updated: updated,
          raw_response: `[${ambiente}] ignorados=${ignored} tempo=${Date.now() - startedAt}ms\n${raw}`,
        });
        await sr.entities.integrations.update(integration_id, { last_sync_at: finishedAt });
        return Response.json({ ok: true, message: `Sincronização concluída (${ambiente}). ${created} novo(s), ${updated} atualizado(s), ${ignored} ignorado(s).`, created, updated, ignored, received: orders.length });
      } catch (err) {
        await sr.entities.integration_sync_logs.update(log.id, {
          status: 'erro', finished_at: new Date().toISOString(),
          error_message: err.message, raw_response: `[${ambiente}] tempo=${Date.now() - startedAt}ms`,
        });
        return Response.json({ error: err.message }, { status: 502 });
      }
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});