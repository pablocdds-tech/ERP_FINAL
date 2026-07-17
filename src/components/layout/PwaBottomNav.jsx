import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, ListChecks, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwa } from "@/lib/PwaContext";

const ITEMS_FUNC = [
  { to: "/app", icon: Home, label: "Início", exact: true },
  { to: "/app/escala", icon: Calendar, label: "Escala" },
  { to: "/app/tarefas", icon: ListChecks, label: "Tarefas" },
  { to: "/app/solicitacoes", icon: ShieldCheck, label: "Pedidos" },
];

const ITEMS_GESTOR = [
  { to: "/app", icon: Home, label: "Início", exact: true },
  { to: "/app/aprovacoes", icon: ShieldCheck, label: "Aprovar" },
  { to: "/app/dashboard", icon: BarChart3, label: "Dash" },
  { to: "/app/tarefas", icon: ListChecks, label: "Tarefas" },
];

export default function PwaBottomNav() {
  const location = useLocation();
  const { gestor } = usePwa() || {};
  const items = gestor ? ITEMS_GESTOR : ITEMS_FUNC;
  const isActive = (item) => item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
      <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link key={item.to} to={item.to}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground")}>
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}