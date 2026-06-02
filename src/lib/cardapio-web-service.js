import { base44 } from "@/api/base44Client";

// Camada de acesso à integração Cardápio Web (frontend).
// NUNCA manuseia o token completo — apenas backend (secret).

export const cardapioWebService = {
  listIntegracoes: () => base44.entities.integrations.filter({ provider: "cardapio_web" }, "-updated_date", 200),

  // Salva/atualiza integração. O token completo NÃO é gravado na entidade.
  // Recebe apenas o mascarado para exibição.
  salvar: async (form) => {
    const data = {
      store_id: form.store_id || "",
      provider: "cardapio_web",
      name: form.name || "",
      external_store_code: form.external_store_code || "",
      base_url: form.base_url || "",
      api_token_mascarado: form.api_token_mascarado || "",
      api_token_secret_name: "CARDAPIO_WEB_API_TOKEN",
      token_configurado: form.token_configurado ?? false,
      webhook_secret: form.webhook_secret || gerarSecret(),
      active: form.active ?? true,
    };
    if (form.id) {
      await base44.entities.integrations.update(form.id, data);
      return { ...form, ...data };
    }
    return base44.entities.integrations.create(data);
  },

  getWebhookUrl: (integration_id) =>
    base44.functions.invoke("cardapioWebSetup", { action: "getWebhookUrl", integration_id }).then((r) => r.data),

  tokenStatus: (integration_id) =>
    base44.functions.invoke("cardapioWebSetup", { action: "tokenStatus", integration_id }).then((r) => r.data),

  testConnection: (integration_id) =>
    base44.functions.invoke("cardapioWebIntegration", { action: "testConnection", integration_id }).then((r) => r.data),

  syncOrders: (integration_id, since) =>
    base44.functions.invoke("cardapioWebIntegration", { action: "syncOrders", integration_id, since }).then((r) => r.data),

  listSyncLogs: (integration_id) =>
    base44.entities.integration_sync_logs.filter({ integration_id }, "-created_date", 50),

  listWebhookEvents: (integration_id) =>
    base44.entities.integration_webhook_events.filter({ integration_id }, "-created_date", 50),

  listPedidos: () => base44.entities.external_orders.list("-ordered_at", 500),
  listItens: (external_order_id) => base44.entities.external_order_items.filter({ external_order_id }, "created_date", 200),
};

export function gerarSecret() {
  return "cw_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function mascararToken(token) {
  const t = String(token || "").trim();
  if (t.length <= 4) return t ? "••••" : "";
  return "••••••••" + t.slice(-4);
}