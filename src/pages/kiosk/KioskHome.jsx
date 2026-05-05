import { useOutletContext } from "react-router-dom";
import { Clock, Camera, UserPlus, Wifi, WifiOff, Store } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import KioskBatidaFlow from "@/components/kiosk/KioskBatidaFlow";
import KioskCadastroFacialFlow from "@/components/kiosk/KioskCadastroFacialFlow";
import KioskAutoFlow from "@/components/kiosk/KioskAutoFlow";
import { carregarConfigPonto } from "@/lib/ponto-config-service";
import { base44 } from "@/api/base44Client";

export default function KioskHome() {
  const ctx = useOutletContext() || {};
  const device = ctx.device;
  const [agora, setAgora] = useState(new Date());
  const [batendo, setBatendo] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [config, setConfig] = useState(null);
  const [loja, setLoja] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    carregarConfigPonto().then(setConfig).catch(() => setConfig({}));
  }, []);

  useEffect(() => {
    if (!device?.loja_id) return;
    base44.entities.Loja.filter({ id: device.loja_id })
      .then((arr) => setLoja(arr[0] || null))
      .catch(() => {});
  }, [device?.loja_id]);

  useEffect(() => {
    const onU = () => setOnline(true);
    const onD = () => setOnline(false);
    window.addEventListener("online", onU);
    window.addEventListener("offline", onD);
    return () => {
      window.removeEventListener("online", onU);
      window.removeEventListener("offline", onD);
    };
  }, []);

  const deteccaoAuto = config?.["ponto.kiosk.deteccao_automatica"] !== false;

  // Modo automático: ocupa toda a tela com câmera + painel
  if (config && deteccaoAuto) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <TopBar agora={agora} loja={loja} device={device} online={online} />
        <KioskAutoFlow device={device} config={config} />
        <BottomBar onCadastrar={() => setCadastrando(true)} device={device} />
        {cadastrando && <KioskCadastroFacialFlow device={device} onClose={() => setCadastrando(false)} />}
      </div>
    );
  }

  // Modo manual (fallback se a config estiver desligada)
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">
        Kiosk · {device?.nome_dispositivo || "Tablet"}
      </div>
      <Clock className="w-14 h-14 text-slate-300 mb-4" />
      <div className="text-7xl font-mono font-semibold tabular-nums">
        {format(agora, "HH:mm:ss")}
      </div>
      <div className="text-base text-slate-400 mt-2">
        {format(agora, "EEEE, dd/MM/yyyy")}
      </div>
      <button
        className="mt-12 inline-flex items-center gap-3 bg-white text-slate-900 rounded-full px-10 py-5 text-xl font-medium shadow-lg active:scale-[0.98] transition"
        onClick={() => setBatendo(true)}
      >
        <Camera className="w-6 h-6" />
        Bater ponto
      </button>
      <button
        className="mt-4 inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm underline-offset-4 hover:underline"
        onClick={() => setCadastrando(true)}
      >
        <UserPlus className="w-4 h-4" />
        Cadastrar minha facial
      </button>
      <div className="absolute bottom-4 right-6 text-[10px] text-slate-600">
        {device?.device_id}
      </div>
      {batendo && <KioskBatidaFlow device={device} onClose={() => setBatendo(false)} />}
      {cadastrando && <KioskCadastroFacialFlow device={device} onClose={() => setCadastrando(false)} />}
    </div>
  );
}

function TopBar({ agora, loja, device, online }) {
  return (
    <div className="px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-sm shrink-0">
      <div className="flex items-center gap-4 text-slate-300 min-w-0">
        <div className="inline-flex items-center gap-2 min-w-0">
          <Store className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="font-medium truncate">{loja?.nome || "Loja"}</span>
        </div>
        <div className="text-slate-600 hidden sm:block">·</div>
        <div className="text-slate-500 hidden sm:block truncate">{device?.nome_dispositivo || "Tablet"}</div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-emerald-400" : "text-amber-400"}`}>
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {online ? "Online" : "Offline"}
        </div>
        <div className="font-mono tabular-nums text-slate-100 text-xl sm:text-2xl font-semibold">
          {format(agora, "HH:mm:ss")}
        </div>
      </div>
    </div>
  );
}

function BottomBar({ onCadastrar, device }) {
  return (
    <div className="px-6 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
      <button
        onClick={onCadastrar}
        className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Cadastrar minha facial
      </button>
      <div className="font-mono opacity-70">{device?.device_id}</div>
    </div>
  );
}