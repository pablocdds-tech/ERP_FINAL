import { useOutletContext } from "react-router-dom";
import { Lock } from "lucide-react";

export default function KioskLocked() {
  const ctx = useOutletContext() || {};
  const device = ctx.device;
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>
        <div className="text-2xl font-semibold mb-2">Tablet bloqueado</div>
        <p className="text-sm text-slate-400">
          Este dispositivo não está autorizado para registrar ponto. Procure o gestor para liberá-lo no ERP.
        </p>
        <p className="text-[11px] text-slate-600 mt-6 font-mono break-all">{device?.device_id}</p>
      </div>
    </div>
  );
}