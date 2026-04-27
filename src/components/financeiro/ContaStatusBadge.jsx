import { Badge } from "@/components/ui/badge";

const MAP = {
  aberta: { label: "Aberta", className: "bg-slate-100 text-slate-700 border-slate-200" },
  parcial: { label: "Parcial", className: "bg-blue-50 text-blue-700 border-blue-200" },
  paga: { label: "Paga", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  recebida: { label: "Recebida", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vencida: { label: "Vencida", className: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelada: { label: "Cancelada", className: "bg-red-50 text-red-700 border-red-200" },
  aberto: { label: "Aberto", className: "bg-slate-100 text-slate-700 border-slate-200" },
  liquidado: { label: "Liquidado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelado: { label: "Cancelado", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function ContaStatusBadge({ status }) {
  const s = MAP[status] || { label: status, className: "" };
  return <Badge variant="outline" className={`font-normal ${s.className}`}>{s.label}</Badge>;
}