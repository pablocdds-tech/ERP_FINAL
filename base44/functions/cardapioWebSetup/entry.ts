import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Utilitários de configuração da integração Cardápio Web (admin):
// - getWebhookUrl: URL pública do webhook + secret + ambiente + base_url
// - tokenStatus: indica se o token (X-API-KEY) está salvo no secret
// - reprocessEvent: reprocessa um evento de webhook que ficou com erro
// - testWebhook: simula localmente um POST mínimo no webhook (sem sair do servidor)

const PROVIDER = 'cardapio_web';

function ambienteDe(baseUrl) {
  return /sandbox/i.test(String(baseUrl || '')) ? 'sandbox' : 'producao';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });

    const sr = base44.asServiceRole;
    const { action, integration_id, event_id } = await req.json();
    const integration = (await sr.entities.integrations.filter({ id: integration_id }))[0];
    if (!integration) return Response.json({ error: 'Integração não encontrada.' }, { status: 404 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = new URL(req.url).origin;
    const secretQs = integration.webhook_secret ? `?secret=${encodeURIComponent(integration.webhook_secret)}` : '';
    const webhookUrl = `${origin}/api/apps/${appId}/functions/cardapioWebWebhook${secretQs}`;

    if (action === 'getWebhookUrl') {
      return Response.json({
        ok: true,
        webhook_url: webhookUrl,
        secret: integration.webhook_secret || '',
        ambiente: ambienteDe(integration.base_url),
        base_url: integration.base_url || '',
      });
    }

    if (action === 'tokenStatus') {
      const env = Deno.env.toObject();
      const hasToken = !!(env['CARDAPIO_WEB_API_KEY'] || env['CARDAPIO_WEB_API_TOKEN']);
      return Response.json({ ok: true, token_configurado: hasToken });
    }

    // Reprocessa um evento de webhook com erro, reenviando o payload bruto ao próprio webhook.
    if (action === 'reprocessEvent') {
      const evt = (await sr.entities.integration_webhook_events.filter({ id: event_id }))[0];
      if (!evt) return Response.json({ error: 'Evento não encontrado.' }, { status: 404 });
      let payload = {};
      try { payload = JSON.parse(evt.raw_payload || '{}'); } catch { payload = {}; }
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      return Response.json({ ok: true, message: 'Evento reprocessado.', result: data });
    }

    // Dispara um POST de teste com um payload mínimo válido para o próprio webhook.
    if (action === 'testWebhook') {
      const fake = {
        event: 'order.test',
        id: `TESTE-${Date.now()}`,
        display_id: 'PED-TESTE',
        status: 'waiting_confirmation',
        merchant_id: integration.external_store_code || '',
        customer: { name: 'Cliente Teste', phone: '11999999999' },
        items: [{ name: 'Item de teste', quantity: 1, unit_price: 10 }],
        total: 10,
        created_at: new Date().toISOString(),
      };
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fake),
      });
      const data = await resp.json().catch(() => ({}));
      return Response.json({ ok: true, message: `Teste enviado (HTTP ${resp.status}).`, status: resp.status, result: data });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});