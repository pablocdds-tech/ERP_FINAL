import { DIAS_SEMANA } from "@/lib/crm-service";

// Mini gráfico de barras horizontais: pedidos por dia da semana.
export default function DiasSemanaBar({ distribuicao, destaqueIdx }) {
  const dados = distribuicao || DIAS_SEMANA.map((d) => ({ dia: d.label, idx: d.idx, qtd: 0 }));
  const max = Math.max(1, ...dados.map((d) => d.qtd));
  return (
    <div className="space-y-1.5">
      {dados.map((d) => {
        const pct = Math.round((d.qtd / max) * 100);
        const isTop = destaqueIdx != null ? d.idx === destaqueIdx : false;
        return (
          <div key={d.idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">{DIAS_SEMANA[d.idx]?.curto}</span>
            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
              <div
                className={`h-full rounded ${isTop ? "bg-primary" : "bg-primary/40"}`}
                style={{ width: `${d.qtd > 0 ? Math.max(pct, 6) : 0}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-6 text-right">{d.qtd}</span>
          </div>
        );
      })}
    </div>
  );
}