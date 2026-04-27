import { Card } from "@/components/ui/card";

const TONES = {
  default: "",
  positive: "border-emerald-300",
  negative: "border-red-300",
  warn: "border-amber-300",
  info: "border-blue-300",
};

export default function StatCard({ label, value, sub, tone = "default", icon: Icon }) {
  return (
    <Card className={`p-4 ${TONES[tone] || ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1 truncate">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        {Icon && <Icon className="w-5 h-5 text-muted-foreground shrink-0" />}
      </div>
    </Card>
  );
}