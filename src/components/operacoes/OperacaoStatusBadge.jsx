import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP = {
  lancada: { label: "Lançada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  recebida: { label: "Recebida", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  aberta: { label: "Aberta", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  em_producao: { label: "Em produção", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  finalizada: { label: "Finalizada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  em_contagem: { label: "Em contagem", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  fechado: { label: "Fechado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

export default function OperacaoStatusBadge({ status }) {
  const m = MAP[status] || { label: status || "—", cls: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cn("font-normal", m.cls)}>{m.label}</Badge>;
}