import { Outlet, Link } from "react-router-dom";
import { Bell, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PwaBottomNav from "./PwaBottomNav";
import { PwaProvider, usePwa } from "@/lib/PwaContext";
import { canAccessAdmin } from "@/lib/perfil";

function NotifBell() {
  const { user } = usePwa() || {};
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user?.email) return;
    const load = () =>
      base44.entities.Notificacao.filter({ destinatario_email: user.email, lida: false }).then((l) => setN(l.length));
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [user?.email]);
  return (
    <Link to="/app/notificacoes" className="relative text-muted-foreground hover:text-foreground">
      <Bell className="w-5 h-5" />
      {n > 0 && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-medium">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}

function PwaShell() {
  const { gestor, user } = usePwa() || {};
  const podeErp = canAccessAdmin(user);
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen pb-20 bg-background">
        <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">V</div>
            <div>
              <div className="text-sm font-semibold leading-none">Vitaliano · Equipe</div>
              {gestor && <div className="text-[10px] text-emerald-600 mt-0.5 leading-none">Gestor</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && <NotifBell />}
            {podeErp && (
              <Link
                to="/admin"
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1"
              >
                <Monitor className="w-3 h-3" />Ir para ERP
              </Link>
            )}
          </div>
        </header>
        <div className="px-4 py-5">
          <Outlet />
        </div>
      </div>
      <PwaBottomNav />
    </div>
  );
}

export default function PwaLayout() {
  return (
    <PwaProvider>
      <PwaShell />
    </PwaProvider>
  );
}