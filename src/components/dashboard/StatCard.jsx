import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, hint, tone = "default", delta, vazio = false, mensagemVazio }) {
  const toneCls = {
    default: "",
    positivo: "text-emerald-600",
    negativo: "text-destructive",
    alerta: "text-amber-600",
    info: "text-blue-600",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{label}</div>
          {vazio ? (
            <div className="mt-1.5 text-xs text-muted-foreground italic">{mensagemVazio || "Sem dados"}</div>
          ) : (
            <>
              <div className={cn("text-xl font-semibold mt-1.5 font-mono tabular-nums", toneCls)}>{value}</div>
              {(hint || delta != null) && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {delta != null && (
                    <span className={cn("inline-flex items-center gap-0.5 font-medium", delta >= 0 ? "text-emerald-600" : "text-destructive")}>
                      {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                    </span>
                  )}
                  {hint && <span className="truncate">{hint}</span>}
                </div>
              )}
            </>
          )}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}