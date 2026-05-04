import { Card } from "@/components/ui/card";
import { AGENTS_CATALOG } from "@/lib/agents-config";

const TONE = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function AgentPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {AGENTS_CATALOG.map((a) => {
        const Icon = a.icon;
        const selected = value === a.chave;
        return (
          <button
            key={a.chave}
            onClick={() => onChange(a.chave)}
            className={`text-left rounded-xl border p-3 transition-all ${
              selected ? "border-foreground bg-foreground/5 shadow-sm" : "border-border hover:border-foreground/30"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${TONE[a.cor] || ""}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.nome}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.descricao}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}