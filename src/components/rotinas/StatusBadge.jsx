import { Badge } from "@/components/ui/badge";

const MAPS = {
  ocorrencia: {
    aberta: "bg-amber-50 text-amber-700 border-amber-200",
    em_analise: "bg-blue-50 text-blue-700 border-blue-200",
    em_andamento: "bg-indigo-50 text-indigo-700 border-indigo-200",
    resolvida: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelada: "bg-slate-100 text-slate-600 border-slate-200",
  },
  os: {
    aberta: "bg-amber-50 text-amber-700 border-amber-200",
    agendada: "bg-blue-50 text-blue-700 border-blue-200",
    em_execucao: "bg-indigo-50 text-indigo-700 border-indigo-200",
    concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelada: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const LABELS = {
  em_analise: "em análise", em_andamento: "em andamento", em_execucao: "em execução",
};

export default function StatusBadge({ status, kind = "ocorrencia" }) {
  const cls = MAPS[kind]?.[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return <Badge variant="outline" className={`font-normal ${cls}`}>{LABELS[status] || status}</Badge>;
}