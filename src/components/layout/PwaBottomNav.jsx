import { Link, useLocation } from "react-router-dom";
import { Home, Clock, Calendar, ListChecks, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePwa } from "@/lib/PwaContext";

const ITEMS_FUNC = [
  { to: "/pwa", icon: Home, label: "Início", exact: true },
  { to: "/pwa/ponto", icon: Clock, label: "Ponto" },
  { to: "/pwa/escala", icon: Calendar, label: "Escala" },
  { to: "/pwa/tarefas", icon: ListChecks, label: "Tarefas" },
  { to: "/pwa/solicitacoes", icon: ShieldCheck, label: "Pedidos" },
];

const ITEMS_GESTOR = [
  { to: "/pwa", icon: Home, label: "Início", exact: true },
  { to: "/pwa/ponto", icon: Clock, label: "Ponto" },
  { to: "/pwa/aprovacoes", icon: ShieldCheck, label: "Aprovar" },
  { to: "/pwa/equipe", icon: Calendar, label: "Equipe" },
  { to: "/pwa/tarefas", icon: ListChecks, label: "Tarefas" },
];

export default function PwaBottomNav() {
  const location = useLocation();
  const { gestor } = usePwa() || {};
  const items = gestor ? ITEMS_GESTOR : ITEMS_FUNC;
  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}