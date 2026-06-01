import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EventoPontoBadge from "@/components/rh/EventoPontoBadge";
import { CheckCircle2, AlertTriangle, Clock, UserX } from "lucide-react";
import { diagnosticoDia, formatMinutos, calcularMinutosTrabalhados } from "@/lib/rh-service";

/** Tabela "Ponto do Dia" — uma linha por colaborador, mostra eventos e status. */
export default function PontoDoDiaTabela({ data, colaboradores, registros, escalas, lojas }) {
  const linhas = colaboradores.map((c) => {
    const regs = registros.filter((r) => r.colaborador_id === c.id);
    const escala = escalas.find((e) => e.colaborador_id === c.id) || null;
    const diag = diagnosticoDia(escala, regs);
    const trab = calcularMinutosTrabalhados(regs);
    const teveEntrada = regs.some((r) => r.tipo === "entrada");
    const teveSaida = regs.some((r) => r.tipo === "saida");
    let situacao = "sem_jornada";
    if (escala?.tipo === "normal" && !teveEntrada) situacao = "ausente";
    else if (teveEntrada && !teveSaida) situacao = "presente";
    else if (teveEntrada && teveSaida) situacao = "encerrou";
    return { c, regs, escala, diag, trab, situacao };
  });

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead>Colaborador</TableHead>
          <TableHead>Escala</TableHead>
          <TableHead>Eventos</TableHead>
          <TableHead>Trabalhado</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">Nenhum colaborador para esta data/loja.</TableCell></TableRow>
        )}
        {linhas
          .sort((a, b) => a.c.nome.localeCompare(b.c.nome))
          .map(({ c, regs, escala, diag, trab, situacao }) => (
            <TableRow key={c.id} className="align-top hover:bg-muted/30">
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell className="text-xs">
                {escala?.tipo === "normal" ? `${escala.hora_entrada}–${escala.hora_saida}` : escala?.tipo || "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {regs.sort((a, b) => a.horario.localeCompare(b.horario)).map((r) => (
                    <EventoPontoBadge key={r.id} registro={r} lojas={lojas} />
                  ))}
                  {regs.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </TableCell>
              <TableCell className="font-mono">{formatMinutos(trab)}</TableCell>
              <TableCell className="text-xs">
                {situacao === "presente" && <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Clock className="w-3 h-3" />Presente</Badge>}
                {situacao === "encerrou" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" />Encerrou</Badge>}
                {situacao === "ausente" && <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><UserX className="w-3 h-3" />Ausente</Badge>}
                {situacao === "sem_jornada" && <span className="text-muted-foreground">Sem jornada</span>}
                {diag.status === "atraso" && <span className="block text-amber-700 mt-1"><AlertTriangle className="w-3 h-3 inline mr-1" />Atraso {diag.atraso_min}min</span>}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}