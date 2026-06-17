import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Store } from "lucide-react";
import { MesasProvider, useMesas } from "@/lib/MesasContext";

// Cabeçalho azul fixo, mobile-first. Mostra contexto (garçom/loja) e voltar.
function MesasHeader() {
  const { garcom, lojaAtual } = useMesas() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const naRaiz = location.pathname === "/mesas" || location.pathname === "/mesas/garcom";

  return (
    <header className="bg-blue-600 text-white sticky top-0 z-20 shadow-md">
      <div className="h-16 px-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {!naRaiz && (
            <button onClick={() => navigate(-1)} className="-ml-1 p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight truncate">Vitaliano · Mesas</div>
            <div className="text-[11px] text-blue-100 flex items-center gap-1 truncate">
              <Store className="w-3 h-3 shrink-0" />
              {lojaAtual?.nome || "Selecione a loja"}
            </div>
          </div>
        </div>
        {garcom && (
          <div className="text-right shrink-0">
            <div className="text-[10px] text-blue-100 leading-none">Garçom</div>
            <div className="text-sm font-semibold leading-tight truncate max-w-[120px]">{garcom.nome}</div>
          </div>
        )}
      </div>
    </header>
  );
}

function MesasShell() {
  return (
    <div className="min-h-screen bg-slate-100">
      <MesasHeader />
      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function MesasLayout() {
  return (
    <MesasProvider>
      <MesasShell />
    </MesasProvider>
  );
}