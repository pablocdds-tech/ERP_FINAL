const fmt = (v) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReceitaPorCanal({ canais, receita }) {
  if (!canais?.length) {
    return <div className="text-sm text-muted-foreground py-2">Sem detalhamento por canal no período.</div>;
  }
  return (
    <div className="space-y-2">
      {canais.map((c) => {
        const pct = receita > 0 ? (c.valor / receita) * 100 : 0;
        return (
          <div key={c.canal_id || c.canal_nome} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{c.canal_nome}</span>
              <span className="tabular-nums">{fmt(c.valor)} <span className="text-xs text-muted-foreground ml-2">{pct.toFixed(1)}%</span></span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-foreground/70" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}