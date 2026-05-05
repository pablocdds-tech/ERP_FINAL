import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { obterDispositivoAtual, pingAcesso } from "@/lib/kiosk-device-service";

export default function KioskGuard() {
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const d = await obterDispositivoAtual();
      if (cancelado) return;
      setDevice(d);
      setLoading(false);
      if (d?.autorizado && d?.ativo) {
        pingAcesso(d).catch(() => {});
      }
    })();
    return () => { cancelado = true; };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Sem cadastro → setup
  if (!device) {
    if (location.pathname === "/kiosk/setup") return <Outlet context={{ device }} />;
    return <Navigate to="/kiosk/setup" replace />;
  }

  // Cadastrado mas não autorizado/ativo → locked
  if (!device.autorizado || !device.ativo) {
    if (location.pathname === "/kiosk/locked") return <Outlet context={{ device }} />;
    return <Navigate to="/kiosk/locked" replace />;
  }

  // Autorizado: bloqueia setup/locked, libera Home
  if (location.pathname === "/kiosk/setup" || location.pathname === "/kiosk/locked") {
    return <Navigate to="/kiosk" replace />;
  }

  return <Outlet context={{ device }} />;
}