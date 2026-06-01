import { TableCell, TableRow } from "@/components/ui/table";
import { formatMinutos } from "@/lib/rh-service";

/** Uma linha da tabela de prévia/fechamento, por colaborador. */
export default function FechamentoLinha({ linha }) {
  const saldoTone = linha.saldo_min >= 0 ? "text-emerald-700" : "text-destructive";
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="font-medium">{linha.colaborador?.nome || "—"}</TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.esperado_min)}</TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.trabalhado_min)}</TableCell>
      <TableCell className={`font-mono ${saldoTone}`}>
        {linha.saldo_min >= 0 ? "+" : "−"}
        {formatMinutos(Math.abs(linha.saldo_min))}
      </TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.he50_min)}</TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.he100_min)}</TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.noturno_ficto_min)}</TableCell>
      <TableCell className="font-mono">{formatMinutos(linha.atraso_min)}</TableCell>
      <TableCell className="text-center">{linha.dias_falta}</TableCell>
    </TableRow>
  );
}