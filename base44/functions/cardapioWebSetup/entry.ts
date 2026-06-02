import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Utilitários de configuração da integração Cardápio Web (admin):
// - getWebhookUrl: retorna a URL pública do webhook para a integração
// - markTokenConfigured: confirma que o token está salvo no secret (sem expor o token)

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });

    const sr = base44.asServiceRole;
    const { action, integration_id } = await req.json();
    const integration = (await sr.entities.integrations.filter({ id: integration_id }))[0];
    if (!integration) return Response.json({ error: 'Integração não encontrada.' }, { status: 404 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = new URL(req.url).origin;
    const secretQs = integration.webhook_secret ? `?secret=${encodeURIComponent(integration.webhook_secret)}` : '';
    const webhookUrl = `${origin}/api/apps/${appId}/functions/cardapioWebWebhook${secretQs}`;

    if (action === 'getWebhookUrl') {
      return Response.json({ ok: true, webhook_url: webhookUrl });
    }

    if (action === 'tokenStatus') {
      const hasToken = !!Deno.env.get('CARDAPIO_WEB_API_TOKEN');
      return Response.json({ ok: true, token_configurado: hasToken });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});