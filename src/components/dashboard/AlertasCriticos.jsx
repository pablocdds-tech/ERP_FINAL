import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SEV = {
  critica: { cls: "border-red-300 bg-red-50 text-red-900", icon: AlertCircle, badge: "bg-red-600 text-white" },
  alta: { cls: "border-amber-300 bg-amber-50 text-amber-900", icon: AlertTriangle, badge: "bg-amber-600 text-white" },
  media: { cls: "border-blue-200 bg-blue-50 text-blue-900", icon: Info, badge: "bg-blue-600 text-white" },
  baixa: { cls: "border-slate-200 bg-slate-50 text-slate-700", icon: Info, badge: "bg-slate-500 text-white" },
};

export default function AlertasCriticos({ alertas }) {
  if (!alertas || alertas.length === 0) {
    return (
      <Card className="p-4 mb-4 border-emerald-200 bg-emerald-50">
        <div className="flex items-center gap-2 text-emerald-800 text-sm">
          <Info className="w-4 h-4" />
          Nenhum alerta crítico no momento.
        </div>
      </Card>
    );
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas críticos
        </h2>
        <span className="text-xs text-muted-foreground">{alertas.length} item(ns)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {alertas.slice(0, 9).map((al, i) => {
          const cfg = SEV[al.severidade] || SEV.baixa;
          const Icon = cfg.icon;
          const content = (
            <div className={cn("rounded-md border p-3 text-xs flex items-start gap-2", cfg.cls)}>
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded", cfg.badge)}>{al.severidade}</span>
                  <div className="font-semibold truncate">{al.titulo}</div>
                </div>
                {al.detalhe && <div className="opacity-80 truncate">{al.detalhe}</div>}
              </div>
              {al.link && <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-1 opacity-60" />}
            </div>
          );
          return al.link ? (
            <Link key={i} to={al.link} className="hover:opacity-90 transition-opacity">{content}</Link>
          ) : <div key={i}>{content}</div>;
        })}
      </div>
    </div>
  );
}