import { Card } from "@/components/ui/card";
import { formatMinutos } from "@/lib/rh-service";

/**
 * Cartões resumidos do período exibidos abaixo da tabela do Espelho.
 * Apenas leitura — não dispara ações.
 */
export default function TotalizadorPeriodo({ totais }) {
  if (!totais) return null;
  const blocos = [
    { label: "Esperado", valor: formatMinutos(totais.esperado_min) },
    { label: "Trabalhado", valor: formatMinutos(totais.trabalhado_min) },
    {
      label: "Saldo",
      valor: (totais.saldo_min >= 0 ? "+" : "−") + formatMinutos(Math.abs(totais.saldo_min)),
      tone: totais.saldo_min >= 0 ? "pos" : "neg",
    },
    { label: "HE 50%", valor: formatMinutos(totais.he50_min) },
    { label: "HE 100%", valor: formatMinutos(totais.he100_min) },
    { label: "Noturno", valor: formatMinutos(totais.noturno_ficto_min) },
    { label: "Atrasos", valor: formatMinutos(totais.atraso_min) },
    { label: "Faltas", valor: String(totais.faltas) },
  ];
  return (
    <Card className="p-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {blocos.map((b) => (
          <div key={b.label} className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{b.label}</span>
            <span
              className={`font-mono text-sm font-semibold ${
                b.tone === "pos" ? "text-emerald-700" : b.tone === "neg" ? "text-destructive" : ""
              }`}
            >
              {b.valor}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        Cálculo provisório com base nas configurações atuais (jornada, feriados, HE, noturno, intervalo).
        Não substitui o fechamento formal do período.
      </p>
    </Card>
  );
}