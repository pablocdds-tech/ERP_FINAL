import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Camera, LogOut, KeyRound, Clock } from "lucide-react";
import CameraCapture from "@/components/ponto/CameraCapture";
import { canAccessAdmin } from "@/lib/perfil";
import { labelPonto, proximoEventoPonto } from "@/lib/rh-service";
import { uploadFotoBlob, registrarBatida, buscarPorPin } from "@/lib/ponto-service";

const DEVICE_KEY = "kiosk_device_id";
const LOJA_KEY = "kiosk_loja_id";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "kiosk-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export default function PwaKioskPonto() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [autorizado, setAutorizado] = useState(false);
  const [lojas, setLojas] = useState([]);
  const [lojaId, setLojaId] = useState(localStorage.getItem(LOJA_KEY) || "");
  const [showCam, setShowCam] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [identificado, setIdentificado] = useState(null); // colaborador
  const [proximo, setProximo] = useState(null);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [exitPin, setExitPin] = useState("");
  const [showExit, setShowExit] = useState(false);
  const [now, setNow] = useState(new Date());

  // Relógio
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // Autorização inicial: precisa ser gestor/admin
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      const ok = canAccessAdmin(u) || u?.role === "admin";
      setAutorizado(ok);
    }).catch(() => setAutorizado(false));
    base44.entities.Loja.list().then((l) => setLojas(l || []));
  }, []);

  const salvarLoja = (id) => {
    setLojaId(id);
    localStorage.setItem(LOJA_KEY, id);
  };

  // Reset após 5s do resultado
  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(() => {
      setResultado(null);
      setIdentificado(null);
      setProximo(null);
      setSelfieBlob(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [resultado]);

  if (!user) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!autorizado) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <Card className="p-6 max-w-sm text-center">
          <div className="text-sm font-medium mb-2">Acesso restrito</div>
          <div className="text-xs text-muted-foreground mb-4">
            Apenas gestor/admin pode iniciar o modo Kiosk.
          </div>
          <Button onClick={() => navigate("/app")}>Voltar</Button>
        </Card>
      </div>
    );
  }

  if (!lojaId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <Card className="p-6 max-w-sm w-full">
          <div className="text-sm font-medium mb-3">Vincular este tablet a uma loja</div>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm mb-3"
            value=""
            onChange={(e) => salvarLoja(e.target.value)}
          >
            <option value="" disabled>— Selecione —</option>
            {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          <div className="text-[11px] text-muted-foreground">
            Após vincular, o dispositivo fica fixo nessa loja.
          </div>
        </Card>
      </div>
    );
  }

  const lojaNome = lojas.find((l) => l.id === lojaId)?.nome || "—";

  // Captura selfie inicial e tenta identificar
  const handleCapture = async (blob) => {
    setShowCam(false);
    setSelfieBlob(blob);
    // Sem identificação prévia ainda — pede PIN
    setShowPin(true);
  };

  // Identifica colaborador pelo PIN
  const confirmarPin = async () => {
    if (!pin) return;
    const col = await buscarPorPin(pin, lojaId);
    if (!col) {
      setResultado({ ok: false, msg: "PIN inválido para esta loja." });
      setShowPin(false);
      setPin("");
      return;
    }
    setIdentificado(col);
    setShowPin(false);
    setPin("");
    // Calcular próximo evento
    const hoje = new Date().toISOString().slice(0, 10);
    const list = await base44.entities.RegistroPonto.filter({ colaborador_id: col.id, data: hoje }, "horario");
    const ativos = list.filter((r) => r.status !== "rejeitado");
    setProximo(proximoEventoPonto(ativos));
  };

  const confirmarPonto = async () => {
    if (!identificado || !proximo || !selfieBlob) return;
    setProcessando(true);
    try {
      const selfie_url = await uploadFotoBlob(selfieBlob);
      const { registro, ia } = await registrarBatida({
        colaborador: identificado,
        tipo: proximo,
        selfie_url,
        origem: "kiosk",
        dispositivo: getDeviceId(),
        fallback_pin: true, // identificação no Kiosk usa PIN, foto só valida a posterior
        lat: undefined, lng: undefined,
      });
      setResultado({
        ok: registro.status === "registrado" || registro.status === "aprovado",
        msg: `${identificado.nome} — ${labelPonto(proximo)} ${
          registro.status === "registrado" ? "registrado!" :
          registro.status === "rejeitado" ? "rejeitado pela IA." :
          "pendente de revisão."
        }${ia?.motivo ? ` ${ia.motivo}` : ""}`,
      });
    } catch {
      setResultado({ ok: false, msg: "Erro ao registrar." });
    } finally {
      setProcessando(false);
    }
  };

  const sairKiosk = () => {
    if (exitPin === "1234" || (user?.role === "admin")) {
      // PIN simbólico ou admin: sair
      navigate("/app");
    } else {
      setResultado({ ok: false, msg: "PIN incorreto." });
    }
    setShowExit(false);
    setExitPin("");
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">V</div>
          <div>
            <div className="text-sm font-semibold leading-none">Kiosk Ponto</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{lojaNome}</div>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowExit(true)} className="text-muted-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-2 text-primary" />
          <div className="text-5xl font-mono font-semibold tabular-nums">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        {!identificado && !resultado && (
          <Button size="lg" className="h-20 px-12 text-xl" onClick={() => setShowCam(true)}>
            <Camera className="w-6 h-6 mr-3" />
            Bater Ponto
          </Button>
        )}

        {identificado && !resultado && (
          <Card className="p-6 w-full max-w-sm text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Identificado</div>
            <div className="text-lg font-semibold">{identificado.nome}</div>
            {proximo ? (
              <>
                <div className="text-sm text-muted-foreground mt-1 mb-4">
                  Próximo: <strong>{labelPonto(proximo)}</strong>
                </div>
                <Button className="w-full h-12 text-base" disabled={processando} onClick={confirmarPonto}>
                  {processando ? "Registrando..." : `Confirmar ${labelPonto(proximo)}`}
                </Button>
                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setIdentificado(null); setSelfieBlob(null); }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <div className="text-sm text-emerald-700 mt-2">Dia completo.</div>
            )}
          </Card>
        )}

        {resultado && (
          <Card className={`p-6 w-full max-w-sm text-center ${resultado.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className={`text-base font-medium ${resultado.ok ? "text-emerald-800" : "text-amber-800"}`}>
              {resultado.msg}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Voltando em instantes...</div>
          </Card>
        )}

        <div className="text-[11px] text-muted-foreground text-center max-w-xs">
          Enquadre o rosto · digite seu PIN · sistema registra automaticamente
        </div>
      </main>

      {showCam && (
        <CameraCapture
          hint="Enquadre seu rosto e capture"
          onCancel={() => setShowCam(false)}
          onCapture={handleCapture}
        />
      )}

      <Dialog open={showPin} onOpenChange={(o) => !o && setShowPin(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle><KeyRound className="w-4 h-4 inline mr-1.5" />Digite seu PIN</DialogTitle></DialogHeader>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="h-12 text-center text-2xl tracking-widest"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPin(false); setPin(""); setSelfieBlob(null); }}>Cancelar</Button>
            <Button onClick={confirmarPin} disabled={!pin}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExit} onOpenChange={(o) => !o && setShowExit(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sair do modo Kiosk</DialogTitle></DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">Apenas gestor/admin. Digite o PIN de saída (1234) ou esteja logado como admin.</div>
          <Input type="password" value={exitPin} onChange={(e) => setExitPin(e.target.value)} placeholder="PIN" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExit(false)}>Cancelar</Button>
            <Button onClick={sairKiosk}>Sair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}