const fmtMoney = (v) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IndicadorCard({ titulo, valor, sufixo, descricao, alvo, status }) {
  // status: "bom" | "atencao" | "ruim" | undefined
  const cor = status === "bom" ? "text-emerald-700 bg-emerald-50"
    : status === "ruim" ? "text-red-700 bg-red-50"
    : status === "atencao" ? "text-amber-700 bg-amber-50"
    : "text-foreground bg-muted";
  const valorFmt = typeof valor === "number"
    ? (sufixo === "%" ? `${valor.toFixed(1)}%` : sufixo === "$" ? fmtMoney(valor) : valor.toFixed(2))
    : valor;
  return (
    <div className={`p-4 rounded-lg ${cor}`}>
      <div className="text-xs text-muted-foreground">{titulo}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{valorFmt}</div>
      {descricao && <div className="text-xs text-muted-foreground mt-1">{descricao}</div>}
      {alvo && <div className="text-[11px] text-muted-foreground mt-0.5">Alvo: {alvo}</div>}
    </div>
  );
}