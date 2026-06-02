import { useEffect, useState } from "react";
import PageShell from "@/components/financeiro/PageShell";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { cardapioWebService, mascararToken } from "@/lib/cardapio-web-service";
import { SyncLogs, WebhookEvents } from "@/components/integracoes/CardapioWebLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, RefreshCw, Plug, Save, ShieldCheck, ExternalLink } from "lucide-react";

const vazio = { name: "Cardápio Web", store_id: "", external_store_code: "", base_url: "https://integracao.cardapioweb.com", active: true, api_token_mascarado: "", token_configurado: false };

export default function CardapioWebIntegracao() {
  const [integracao, setIntegracao] = useState(vazio);
  const [tokenInput, setTokenInput] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await cardapioWebService.listIntegracoes();
    const atual = list[0] || vazio;
    setIntegracao(atual);
    if (atual.id) {
      const [u, l, e, t] = await Promise.all([
        cardapioWebService.getWebhookUrl(atual.id),
        cardapioWebService.listSyncLogs(atual.id),
        cardapioWebService.listWebhookEvents(atual.id),
        cardapioWebService.tokenStatus(atual.id),
      ]);
      setWebhookUrl(u?.webhook_url || "");
      setLogs(l || []);
      setEvents(e || []);
      setIntegracao((prev) => ({ ...prev, token_configurado: t?.token_configurado }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const salvar = async () => {
    setBusy(true);
    const patch = { ...integracao };
    // O token completo é tratado pelo backend (secret). Aqui só guardamos o mascarado.
    if (tokenInput.trim()) {
      patch.api_token_mascarado = mascararToken(tokenInput);
      patch.token_configurado = true;
      setTokenInput("");
    }
    const saved = await cardapioWebService.salvar(patch);
    setIntegracao(saved);
    toast.success("Integração salva.");
    await load();
    setBusy(false);
  };

  const testar = async () => {
    if (!integracao.id) return toast.error("Salve a integração primeiro.");
    setBusy(true);
    try {
      const r = await cardapioWebService.testConnection(integracao.id);
      toast.success(r.message || "Conexão OK.");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Conexão falhou.");
    }
    await load();
    setBusy(false);
  };

  const sincronizar = async () => {
    if (!integracao.id) return toast.error("Salve a integração primeiro.");
    setBusy(true);
    try {
      const r = await cardapioWebService.syncOrders(integracao.id);
      toast.success(r.message || "Sincronização concluída.");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao sincronizar.");
    }
    await load();
    setBusy(false);
  };

  const copiar = () => { navigator.clipboard.writeText(webhookUrl); toast.success("URL do webhook copiada."); };

  return (
    <PageShell
      title="Integração Cardápio Web"
      description="Receba e importe pedidos do Cardápio Web. O token da API fica salvo de forma segura no servidor."
      actions={<Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Configuração</h3>
          <label className="space-y-1 block"><span className="text-sm font-medium">Nome</span><Input value={integracao.name || ""} onChange={(e) => setIntegracao({ ...integracao, name: e.target.value })} /></label>
          <label className="space-y-1 block"><span className="text-sm font-medium">Loja/unidade do ERP</span><LojaSingleSelect value={integracao.store_id} onChange={(v) => setIntegracao({ ...integracao, store_id: v })} emptyLabel="Selecione" /></label>
          <label className="space-y-1 block"><span className="text-sm font-medium">Código da loja no Cardápio Web</span><Input value={integracao.external_store_code || ""} onChange={(e) => setIntegracao({ ...integracao, external_store_code: e.target.value })} /></label>
          <label className="space-y-1 block"><span className="text-sm font-medium">Base URL da API</span><Input value={integracao.base_url || ""} onChange={(e) => setIntegracao({ ...integracao, base_url: e.target.value })} placeholder="https://integracao.cardapioweb.com" /><span className="text-xs text-muted-foreground">Produção: https://integracao.cardapioweb.com • Sandbox: https://integracao.sandbox.cardapioweb.com</span></label>
          <label className="space-y-1 block">
            <span className="text-sm font-medium">Token da API</span>
            <Input type="password" autoComplete="off" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={integracao.token_configurado ? (integracao.api_token_mascarado || "Token configurado") : "Cole o token da API"} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {integracao.token_configurado ? <><ShieldCheck className="w-3 h-3 text-emerald-600" /> Token salvo com segurança {integracao.api_token_mascarado ? `(${integracao.api_token_mascarado})` : ""}</> : "Nunca exposto no app. Salvo apenas no servidor."}
            </span>
          </label>
          <label className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm">Integração ativa</span><Switch checked={!!integracao.active} onCheckedChange={(v) => setIntegracao({ ...integracao, active: v })} /></label>
          <div className="text-xs text-muted-foreground">Última sincronização: {integracao.last_sync_at ? new Date(integracao.last_sync_at).toLocaleString("pt-BR") : "—"}</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={busy}><Save className="w-4 h-4" /> Salvar</Button>
            <Button variant="outline" onClick={testar} disabled={busy}><Plug className="w-4 h-4" /> Testar conexão</Button>
            <Button variant="outline" onClick={sincronizar} disabled={busy}><RefreshCw className="w-4 h-4" /> Sincronizar agora</Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">Webhook <Badge variant="secondary" className="ml-1">Recomendado</Badge></h3>
          <p className="text-sm text-muted-foreground">Método principal de recebimento de pedidos — em tempo real e sem limite de requisições. Copie a URL abaixo e cadastre no painel do Cardápio Web (<strong>Configurações → Integrações → API/Webhooks</strong>).</p>
          <p className="text-xs text-muted-foreground">No ambiente <strong>Sandbox</strong>, a ativação do webhook deve ser solicitada por e-mail: <strong>integracao@cardapioweb.com</strong>.</p>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl || (integracao.id ? "Gerando..." : "Salve a integração para gerar a URL")} className="font-mono text-xs" />
            <Button variant="outline" onClick={copiar} disabled={!webhookUrl}><Copy className="w-4 h-4" /> Copiar</Button>
          </div>
          <a href="https://cardapioweb.com" target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">Abrir Cardápio Web <ExternalLink className="w-3 h-3" /></a>
          <div className="pt-2"><Badge variant="secondary">Origem: Cardápio Web</Badge></div>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold">Logs de sincronização</h3>
        <SyncLogs logs={logs} />
      </div>
      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold">Eventos de webhook</h3>
        <WebhookEvents events={events} />
      </div>
    </PageShell>
  );
}