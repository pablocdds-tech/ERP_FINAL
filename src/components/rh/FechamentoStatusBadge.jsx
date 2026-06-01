import { Badge } from "@/components/ui/badge";
import { Lock, LockOpen, FileClock } from "lucide-react";

const cfg = {
  aberto:   { label: "Aberto",   cls: "bg-slate-100 text-slate-700 border-slate-200",   Icon: LockOpen },
  fechado:  { label: "Fechado",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: Lock },
  reaberto: { label: "Reaberto", cls: "bg-amber-100 text-amber-800 border-amber-200",  Icon: FileClock },
};

export default function FechamentoStatusBadge({ status }) {
  const c = cfg[status] || cfg.aberto;
  const Icon = c.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${c.cls}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </Badge>
  );
}