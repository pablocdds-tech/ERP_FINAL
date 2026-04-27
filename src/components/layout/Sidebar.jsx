import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Smartphone, ShieldCheck, FileSearch } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const NavItem = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    )}
  >
    <Icon className="w-4 h-4 shrink-0" />
    <span className="truncate">{label}</span>
  </Link>
);

export default function Sidebar({ onNavigate }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <aside className="h-full w-64 bg-card border-r border-border flex flex-col">
      <div className="px-5 h-16 flex items-center border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            V
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Vitaliano</div>
            <div className="text-xs text-muted-foreground">ERP</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem
          to="/"
          icon={LayoutDashboard}
          label="Dashboard"
          active={isActive("/") && location.pathname === "/"}
          onClick={onNavigate}
        />

        <div className="pt-4 pb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Módulos
        </div>

        {MODULES.map((m) => (
          <NavItem
            key={m.id}
            to={m.path}
            icon={m.icon}
            label={m.nome}
            active={isActive(m.path)}
            onClick={onNavigate}
          />
        ))}

        <div className="pt-4 pb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Sistema
        </div>
        <NavItem
          to="/aprovacoes"
          icon={ShieldCheck}
          label="Aprovações"
          active={isActive("/aprovacoes")}
          onClick={onNavigate}
        />
        {user?.role === "admin" && (
          <NavItem
            to="/auditoria"
            icon={FileSearch}
            label="Auditoria"
            active={isActive("/auditoria")}
            onClick={onNavigate}
          />
        )}
        <NavItem
          to="/pwa"
          icon={Smartphone}
          label="PWA"
          active={isActive("/pwa")}
          onClick={onNavigate}
        />
      </nav>

      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        v0.1 · Fundação
      </div>
    </aside>
  );
}