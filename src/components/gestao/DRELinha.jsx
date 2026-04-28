const fmt = (v) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}R$ ${abs}`;
};

function VariacaoTag({ atual, anterior }) {
  if (anterior === undefined || anterior === null) return null;
  const dif = (Number(atual) || 0) - (Number(anterior) || 0);
  const pct = anterior !== 0 ? (dif / Math.abs(anterior)) * 100 : 0;
  if (Math.abs(dif) < 0.005) return <span className="text-xs text-muted-foreground w-20 text-right">—</span>;
  const positivo = dif > 0;
  return (
    <span className={`text-xs w-20 text-right tabular-nums ${positivo ? "text-emerald-600" : "text-red-600"}`}>
      {positivo ? "▲" : "▼"} {pct.toFixed(1)}%
    </span>
  );
}

export default function DRELinha({
  label, valor, valorVencer, anterior, pct, bold, neg, indent = 0, top, separador, hint,
}) {
  const cls = neg ? "text-red-600" : "";
  return (
    <div className={`flex items-center justify-between py-2 ${separador ? "border-t" : ""} ${top ? "border-t-2 border-foreground/30" : ""}`}>
      <div style={{ paddingLeft: indent * 16 }} className={`text-sm ${bold ? "font-semibold" : ""} ${cls}`}>
        {label}
        {hint && <span className="text-xs text-muted-foreground ml-2">{hint}</span>}
      </div>
      <div className="flex items-center gap-3">
        {pct !== undefined && <span className="text-xs text-muted-foreground w-14 text-right">{pct}</span>}
        <div className={`text-sm tabular-nums ${bold ? "font-semibold" : ""} ${cls} w-32 text-right`}>{fmt(valor)}</div>
        {valorVencer !== undefined ? (
          <div className={`text-sm tabular-nums w-32 text-right ${valorVencer > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
            {valorVencer > 0 ? fmt(valorVencer) : "—"}
          </div>
        ) : <div className="w-32" />}
        <VariacaoTag atual={valor} anterior={anterior} />
      </div>
    </div>
  );
}