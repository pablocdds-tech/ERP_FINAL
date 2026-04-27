import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Camera, CheckCircle2 } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { proximoEventoPonto, labelPonto } from "@/lib/rh-service";
import { format } from "date-fns";

export default function PwaPonto() {
  const { colaborador } = usePwa() || {};
  const [registros, setRegistros] = useState([]);
  const [permitirGeo, setPermitirGeo] = useState(false);
  const [permitirSelfie, setPermitirSelfie] = useState(false);
  const [batendo, setBatendo] = useState(false);
  const [msg, setMsg] = useState(null);

  const hoje = new Date().toISOString().slice(0, 10);

  const load = async () => {
    if (!colaborador?.id) return;
    const list = await base44.entities.RegistroPonto.filter(
      { colaborador_id: colaborador.id, data: hoje }, "horario"
    );
    setRegistros(list);
  };
  useEffect(() => { load(); }, [colaborador?.id]); // eslint-disable-line

  const proximo = proximoEventoPonto(registros);

  const tirarSelfie = () => new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "user";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        resolve(file_url);
      } catch { resolve(null); }
    };
    input.click();
  });

  const pegarPosicao = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false }
    );
  });

  const bater = async () => {
    if (!colaborador?.id || !proximo) return;
    setBatendo(true); setMsg(null);
    let lat, lng, selfie_url;
    if (permitirGeo) {
      const pos = await pegarPosicao();
      if (pos) { lat = pos.lat; lng = pos.lng; }
    }
    if (permitirSelfie) {
      selfie_url = await tirarSelfie() || undefined;
    }
    const agora = new Date();
    await base44.entities.RegistroPonto.create({
      colaborador_id: colaborador.id,
      loja_id: colaborador.loja_id,
      data: hoje,
      tipo: proximo,
      horario: agora.toISOString(),
      latitude: lat, longitude: lng,
      selfie_url,
      origem: "pwa",
      status: "registrado",
    });
    setMsg(`Ponto registrado: ${labelPonto(proximo)} às ${format(agora, "HH:mm")}`);
    setBatendo(false);
    load();
  };

  if (!colaborador) {
    return (
      <div>
        <PageTitle title="Ponto" />
        <Card className="p-5 text-sm text-muted-foreground">Seu usuário não está vinculado a um colaborador. Procure o gestor.</Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Bater ponto" subtitle={colaborador.nome} />

      <Card className="p-6 mb-4 text-center">
        <Clock className="w-10 h-10 mx-auto mb-2 text-primary" />
        <div className="text-2xl font-mono font-semibold">{format(new Date(), "HH:mm")}</div>
        <div className="text-xs text-muted-foreground mt-1">{format(new Date(), "EEEE, dd/MM/yyyy")}</div>
        {proximo ? (
          <Button className="w-full mt-5 h-12 text-base" disabled={batendo} onClick={bater}>
            {batendo ? "Registrando..." : `Bater ${labelPonto(proximo)}`}
          </Button>
        ) : (
          <div className="mt-5 text-sm text-emerald-700 font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Dia completo
          </div>
        )}
        {msg && <div className="mt-3 text-xs text-emerald-700">{msg}</div>}
      </Card>

      <Card className="p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="geo" className="flex items-center gap-2 text-sm cursor-pointer">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Salvar localização
          </Label>
          <Switch id="geo" checked={permitirGeo} onCheckedChange={setPermitirGeo} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="selfie" className="flex items-center gap-2 text-sm cursor-pointer">
            <Camera className="w-4 h-4 text-muted-foreground" /> Tirar selfie
          </Label>
          <Switch id="selfie" checked={permitirSelfie} onCheckedChange={setPermitirSelfie} />
        </div>
        <div className="text-[11px] text-muted-foreground">Opcional. Só registramos se você ativar.</div>
      </Card>

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Hoje</div>
      <Card className="overflow-hidden">
        {registros.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum registro hoje.</div>
        ) : registros.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
            <div>
              <div className="text-sm font-medium">{labelPonto(r.tipo)}</div>
              {r.ajustado && <div className="text-[10px] text-amber-700">Ajustado pelo gestor</div>}
            </div>
            <div className="text-sm font-mono">{format(new Date(r.horario), "HH:mm")}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}