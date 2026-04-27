import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import CameraCapture from "@/components/ponto/CameraCapture";
import { usePwa } from "@/lib/PwaContext";
import { labelPonto } from "@/lib/rh-service";
import { obterProximoEvento, registrarBatida, uploadFotoBlob } from "@/lib/ponto-service";
import { extrairDescritor, distancia, similaridade, DEFAULT_THRESHOLD } from "@/lib/biometria";
import { format } from "date-fns";

export default function PwaPonto() {
  const { colaborador } = usePwa() || {};
  const [registros, setRegistros] = useState([]);
  const [proximo, setProximo] = useState(null);
  const [permitirGeo, setPermitirGeo] = useState(false);
  const [batendo, setBatendo] = useState(false);
  const [showCam, setShowCam] = useState(false);
  const [resultado, setResultado] = useState(null); // {ok, msg}

  const load = async () => {
    if (!colaborador?.id) return;
    const { proximo: prox, registros: regs } = await obterProximoEvento(colaborador.id);
    setProximo(prox);
    setRegistros(regs);
  };
  useEffect(() => { load(); }, [colaborador?.id]); // eslint-disable-line

  const facialOk = colaborador?.facial_status === "cadastrada";

  const pegarPosicao = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false }
    );
  });

  const handleCapture = async (blob) => {
    setShowCam(false);
    if (!proximo) return;
    setBatendo(true);
    setResultado(null);
    try {
      let lat, lng;
      if (permitirGeo) {
        const pos = await pegarPosicao();
        if (pos) { lat = pos.lat; lng = pos.lng; }
      }

      // Match biométrico local (face-api) contra o template do colaborador
      let match_score, match_dist;
      if (colaborador?.biometria_template) {
        try {
          const img = await blobToImage(blob);
          const probe = await extrairDescritor(img);
          if (probe?.descriptor) {
            const ref = JSON.parse(colaborador.biometria_template);
            match_dist = distancia(probe.descriptor, ref);
            match_score = similaridade(match_dist);
          }
        } catch { /* segue sem match local */ }
      }

      const selfie_url = await uploadFotoBlob(blob);
      const ret = await registrarBatida({
        colaborador, tipo: proximo, selfie_url, origem: "pwa", lat, lng, match_score, match_dist,
      });

      if (ret.offline) {
        setResultado({ ok: true, status: "offline", msg: `${labelPonto(proximo)} salvo offline. Sincroniza quando voltar a conexão.` });
      } else {
        const { registro, ia } = ret;
        const matchInfo = match_score != null ? ` (match ${(match_score * 100).toFixed(0)}%)` : "";
        setResultado({
          ok: registro.status === "registrado",
          status: registro.status,
          msg: msgPorStatus(registro.status, ia, proximo) + matchInfo,
        });
      }
    } catch (e) {
      setResultado({ ok: false, status: "erro", msg: "Falha ao registrar. Tente novamente." });
    } finally {
      setBatendo(false);
      load();
    }
  };

  function blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
      img.onerror = (e) => { reject(e); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  if (!colaborador) {
    return (
      <div>
        <PageTitle title="Ponto" />
        <Card className="p-5 text-sm text-muted-foreground">
          Seu usuário não está vinculado a um colaborador. Procure o gestor.
        </Card>
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

        {!facialOk ? (
          <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Cadastro facial necessário.</strong> Procure o gestor para cadastrar suas fotos de referência. Sem isso, a batida fica pendente de revisão.
              </div>
            </div>
          </div>
        ) : null}

        {proximo ? (
          <Button
            className="w-full mt-5 h-12 text-base"
            disabled={batendo}
            onClick={() => setShowCam(true)}
          >
            <Camera className="w-4 h-4 mr-2" />
            {batendo ? "Registrando..." : `Bater ${labelPonto(proximo)}`}
          </Button>
        ) : (
          <div className="mt-5 text-sm text-emerald-700 font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Dia completo
          </div>
        )}

        {resultado && (
          <div className={`mt-3 text-xs rounded-lg p-2.5 ${
            resultado.ok ? "bg-emerald-50 text-emerald-700" :
            resultado.status === "rejeitado" ? "bg-red-50 text-red-700" :
            "bg-amber-50 text-amber-800"
          }`}>
            {resultado.msg}
          </div>
        )}
      </Card>

      <Card className="p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="geo" className="flex items-center gap-2 text-sm cursor-pointer">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Salvar localização
          </Label>
          <Switch id="geo" checked={permitirGeo} onCheckedChange={setPermitirGeo} />
        </div>
        <div className="text-[11px] text-muted-foreground">
          A selfie é obrigatória — usada para validar sua identidade pela IA.
        </div>
      </Card>

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Hoje</div>
      <Card className="overflow-hidden">
        {registros.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum registro hoje.</div>
        ) : registros.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
            <div>
              <div className="text-sm font-medium">{labelPonto(r.tipo)}</div>
              <div className="text-[10px] text-muted-foreground">
                {r.status === "pendente_revisao" && "Pendente revisão"}
                {r.status === "rejeitado" && "Rejeitado"}
                {r.status === "registrado" && "Registrado"}
                {r.status === "aprovado" && "Aprovado"}
                {r.ajustado && " · Ajustado"}
              </div>
            </div>
            <div className="text-sm font-mono">{format(new Date(r.horario), "HH:mm")}</div>
          </div>
        ))}
      </Card>

      {showCam && (
        <CameraCapture
          hint={`${labelPonto(proximo)} — enquadre o rosto`}
          onCancel={() => setShowCam(false)}
          onCapture={handleCapture}
        />
      )}
    </div>
  );
}

function msgPorStatus(status, ia, tipo) {
  if (status === "registrado") return `${labelPonto(tipo)} registrado e validado pela IA.`;
  if (status === "pendente_revisao") return `${labelPonto(tipo)} registrado, mas pendente de revisão${ia?.motivo ? `: ${ia.motivo}` : ""}.`;
  if (status === "rejeitado") return `Batida rejeitada${ia?.motivo ? `: ${ia.motivo}` : ""}. Procure o gestor.`;
  if (status === "aprovado") return `${labelPonto(tipo)} aprovado.`;
  return "Falha ao processar.";
}