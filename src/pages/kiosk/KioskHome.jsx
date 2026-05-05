import { useOutletContext } from "react-router-dom";
import { Clock, Camera } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import KioskBatidaFlow from "@/components/kiosk/KioskBatidaFlow";

export default function KioskHome() {
  const ctx = useOutletContext() || {};
  const device = ctx.device;
  const [agora, setAgora] = useState(new Date());
  const [batendo, setBatendo] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
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
      <div className="absolute bottom-4 right-6 text-[10px] text-slate-600">
        {device?.device_id}
      </div>
      {batendo && <KioskBatidaFlow device={device} onClose={() => setBatendo(false)} />}
    </div>
  );
}