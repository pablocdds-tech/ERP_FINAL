import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutos } from "@/lib/rh-service";

const LABEL_STATUS = {
  ok: "OK", atraso: "Atraso", falta: "Falta", feriado: "Feriado", sem_jornada: "Sem jornada",
};

/** Detalhamento dia-a-dia da origem do saldo de banco de horas de um colaborador. */
export default function BancoHorasDetalhe({ resumos }) {
  const dias = (resumos || []).filter(
    (r) => r.saldo_min !== 0 || r.he50_min || r.he100_min || r.status === "falta" || r.atraso_min,
  );

  if (dias.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Sem dias que impactaram o saldo no período.</div>;
  }

  return (
    <div className="bg-muted/20 px-4 py-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Dia</TableHead>
            <TableHead className="text-[11px]">Situação</TableHead>
            <TableHead className="text-[11px]">Trabalhado</TableHead>
            <TableHead className="text-[11px]">Saldo</TableHead>
            <TableHead className="text-[11px]">HE 50%</TableHead>
            <TableHead className="text-[11px]">HE 100%</TableHead>
            <TableHead className="text-[11px]">Atraso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dias.map((r) => (
            <TableRow key={r.data} className="text-xs">
              <TableCell className="font-mono">{r.data.slice(8, 10)}/{r.data.slice(5, 7)}</TableCell>
              <TableCell>
                <span className={r.status === "falta" ? "text-destructive" : r.status === "atraso" ? "text-amber-700" : "text-muted-foreground"}>
                  {LABEL_STATUS[r.status] || r.status}
                </span>
              </TableCell>
              <TableCell className="font-mono">{formatMinutos(r.trabalhado_min)}</TableCell>
              <TableCell className={`font-mono ${r.saldo_min >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                {r.saldo_min >= 0 ? "+" : "−"}{formatMinutos(Math.abs(r.saldo_min))}
              </TableCell>
              <TableCell className="font-mono">{r.he50_min ? formatMinutos(r.he50_min) : "—"}</TableCell>
              <TableCell className="font-mono">{r.he100_min ? formatMinutos(r.he100_min) : "—"}</TableCell>
              <TableCell className="font-mono">{r.atraso_min ? `${r.atraso_min}min` : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}