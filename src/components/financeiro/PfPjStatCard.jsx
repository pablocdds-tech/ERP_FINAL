import { Card } from "@/components/ui/card";

const fmt = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PfPjStatCard({ label, value, hint, tone = "default", icon: Icon }) {
  const toneCls = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-rose-600",
    warning: "text-amber-600",
  }[tone] || "text-foreground";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`mt-2 text-xl font-semibold font-mono ${toneCls}`}>{fmt(value)}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}