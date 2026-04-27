import { Badge } from "@/components/ui/badge";

const MAP = {
  aberto: { label: "Aberto", className: "bg-slate-100 text-slate-700 border-slate-200" },
  conferido: { label: "Conferido", className: "bg-blue-50 text-blue-700 border-blue-200" },
  fechado: { label: "Fechado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  divergente: { label: "Divergente", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function FechamentoStatusBadge({ status }) {
  const s = MAP[status] || { label: status, className: "" };
  return <Badge variant="outline" className={`font-normal ${s.className}`}>{s.label}</Badge>;
}