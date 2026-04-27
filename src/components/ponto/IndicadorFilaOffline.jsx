import { useEffect, useState } from "react";
import { CloudOff, Cloud } from "lucide-react";
import { tamanhoFila, sincronizarFila } from "@/lib/ponto-offline-queue";

export default function IndicadorFilaOffline() {
  const [n, setN] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const refresh = async () => {
    try { setN(await tamanhoFila()); } catch { /* */ }
    setOnline(navigator.onLine);
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    const on = () => { setOnline(true); sincronizarFila().finally(refresh); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(i);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online && n === 0) return null;
  return (
    <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${
      !online ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
    }`}>
      {online ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
      {!online ? "Offline" : ""}
      {n > 0 && <span>· {n} na fila</span>}
    </div>
  );
}