import { Badge } from "@/components/ui/badge";
const M = {
  ativo: { label: "Ativo", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  afastado: { label: "Afastado", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  desligado: { label: "Desligado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};
export default function StatusColaboradorBadge({ status }) {
  const s = M[status] || { label: status, cls: "" };
  return <Badge variant="outline" className={`font-normal ${s.cls}`}>{s.label}</Badge>;
}