import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, Map as MapIcon, List, Route } from "lucide-react";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import DeliveryMap from "@/components/delivery/DeliveryMap";
import PainelPendentes from "@/components/delivery/PainelPendentes";
import RotaListItem from "@/components/delivery/RotaListItem";
import CriarRotaDialog from "@/components/delivery/CriarRotaDialog";
import RotaDetalheDialog from "@/components/delivery/RotaDetalheDialog";
import ConfigDialog from "@/components/delivery/ConfigDialog";
import { deliveryService, getRouteStatus, fmtMoeda } from "@/lib/delivery-service";
import { getDeliveryPerms } from "@/lib/delivery-config";

export default function Roteirizacao() {
  const [lojaId, setLojaId] = useState("");
  const [pendentes, setPendentes] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [perms, setPerms] = useState(getDeliveryPerms("operador"));
  const [selecionados, setSelecionados] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [criarOpen, setCriarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [rotaAberta, setRotaAberta] = useState(null);
  const [mobileView, setMobileView] = useState("lista"); // lista | mapa

  useEffect(() => { base44.auth.me().then((u) => setPerms(getDeliveryPerms(u?.role))).catch(() => {}); }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const loja = lojaId || undefined;
    const [pend, rts, drv, cfg] = await Promise.all([
      deliveryService.listPendentes(loja),
      deliveryService.listRotas(loja),
      deliveryService.listDrivers(loja),
      deliveryService.getSettings(loja),
    ]);
    setPendentes(pend);
    setRotas(rts);
    setDrivers(drv);
    setSettings(cfg);
    setLoading(false);
  }, [lojaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const origem = settings && settings.base_latitude != null
    ? { lat: settings.base_latitude, lng: settings.base_longitude, address: settings.base_address }
    : null;

  const toggle = (p) => setSelecionados((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]);

  const confirmarRota = async ({ pedidos, motoboy }) => {
    setSaving(true);
    await deliveryService.criarRota({ lojaId, motoboy, pedidos, settings, origem });
    toast.success("Rota criada com sucesso.");
    setSaving(false);
    setCriarOpen(false);
    setSelecionados([]);
    await carregar();
  };

  const salvarConfig = async (form) => {
    await deliveryService.saveSettings(lojaId, form);
    toast.success("Configurações salvas.");
    await carregar();
  };

  const pedidosSelecionados = pendentes.filter((p) => selecionados.includes(p.id));
  const ultimaDespachada = rotas.find((r) => ["despachada", "em_andamento", "concluida"].includes(r.status));

  const Painel = (
    <Tabs defaultValue="pendentes" className="flex flex-col h-full">
      <div className="px-3 pt-3">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="rotas">Rotas ({rotas.length})</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="pendentes" className="flex-1 overflow-hidden mt-0">
        <PainelPendentes
          pedidos={pendentes} busca={busca} setBusca={setBusca}
          selecionados={selecionados} onToggle={toggle} onClickPedido={() => {}}
          onCriarRota={() => setCriarOpen(true)} podeCriar={perms.criar}
        />
      </TabsContent>
      <TabsContent value="rotas" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0">
        {rotas.length === 0 && <div className="text-center text-sm text-muted-foreground py-10"><Route className="w-8 h-8 mx-auto mb-2 opacity-40" />Nenhuma rota.</div>}
        {rotas.map((r) => <RotaListItem key={r.id} rota={r} onAbrir={setRotaAberta} />)}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Route className="w-5 h-5" /> Roteirização</h1>
        <div className="flex items-center gap-2">
          <div className="w-44 hidden sm:block"><LojaSingleSelect value={lojaId} onChange={setLojaId} emptyLabel="Todas as lojas" /></div>
          <Button variant="outline" size="icon" onClick={carregar} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          {perms.configurar && <Button variant="outline" size="icon" onClick={() => setConfigOpen(true)}><Settings className="w-4 h-4" /></Button>}
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="md:hidden flex gap-2 p-2 border-b border-border">
        <Button variant={mobileView === "lista" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMobileView("lista")}><List className="w-4 h-4" /> Lista</Button>
        <Button variant={mobileView === "mapa" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMobileView("mapa")}><MapIcon className="w-4 h-4" /> Mapa</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${mobileView === "lista" ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0`}>
          {Painel}
        </div>
        <div className={`${mobileView === "mapa" ? "block" : "hidden"} md:block flex-1 p-2`}>
          <DeliveryMap
            origem={origem}
            pedidos={pendentes}
            selecionados={selecionados}
            onMarkerClick={(p) => toggle(p)}
          />
        </div>
      </div>

      {/* Rodapé resumo */}
      <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground overflow-x-auto">
        <span><b className="text-foreground">{pendentes.length}</b> pendentes</span>
        <span><b className="text-foreground">{rotas.length}</b> rotas</span>
        {ultimaDespachada && (
          <span>Última: <b className="text-foreground">{ultimaDespachada.route_number}</b> · {getRouteStatus(ultimaDespachada.status).label} · {fmtMoeda(ultimaDespachada.total_amount)}</span>
        )}
      </div>

      <CriarRotaDialog
        open={criarOpen} onOpenChange={setCriarOpen}
        pedidos={pedidosSelecionados} drivers={drivers} origem={origem}
        settings={settings} onConfirm={confirmarRota} saving={saving}
      />
      <RotaDetalheDialog
        open={!!rotaAberta} onOpenChange={(o) => !o && setRotaAberta(null)}
        rota={rotaAberta} perms={perms} onChanged={carregar}
      />
      <ConfigDialog
        open={configOpen} onOpenChange={setConfigOpen}
        settings={settings} lojaId={lojaId} onSave={salvarConfig}
      />
    </div>
  );
}