import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EventoPontoBadge from "@/components/rh/EventoPontoBadge";
import { CheckCircle2, AlertTriangle, Clock, UserX, Coffee, LogOut, Unlink } from "lucide-react";
import {
  diagnosticoDia, formatMinutos, calcularMinutosTrabalhados, categoriaPonto,
} from "@/lib/rh-service";

/** Configuração visual de cada status do dia. */
const STATUS_UI = {
  encerrado: { label: "Encerrado", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  presente: { label: "Presente", icon: Clock, cls: "bg-blue-100 text-blue-800 border-blue-200" },
  em_intervalo: { label: "Em intervalo", icon: Coffee, cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  atraso: { label: "Atrasado", icon: AlertTriangle, cls: "bg-amber-100 text-amber-800 border-amber-200" },
  falta: { label: "Ausente", icon: UserX, cls: "bg-red-100 text-red-800 border-red-200" },
  sem_saida: { label: "Sem saída", icon: LogOut, cls: "bg-orange-100 text-orange-800 border-orange-200" },
  incompleto: { label: "Ponto incompleto", icon: AlertTriangle, cls: "bg-orange-100 text-orange-800 border-orange-200" },
  saida_antecipada: { label: "Saída antecipada", icon: LogOut, cls: "bg-amber-100 text-amber-800 border-amber-200" },
  sequencia_quebrada: { label: "Sequência quebrada", icon: Unlink, cls: "bg-rose-100 text-rose-800 border-rose-200" },
  sem_jornada: { label: "Sem jornada", icon: null, cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

/** Tabela "Ponto do Dia" — uma linha por colaborador, mostra eventos e status. */
export default function PontoDoDiaTabela({ data, colaboradores, registros, escalas, lojas, statusFiltro = "todos" }) {
  const linhas = colaboradores.map((c) => {
    const regs = registros.filter((r) => r.colaborador_id === c.id);
    const escala = escalas.find((e) => e.colaborador_id === c.id) || null;
    const diag = diagnosticoDia(escala, regs);
    const trab = calcularMinutosTrabalhados(regs);
    return { c, regs, escala, diag, trab, categoria: categoriaPonto(diag) };
  });

  const visiveis = linhas.filter((l) => {
    if (statusFiltro === "todos") return true;
    if (statusFiltro === "presente") return l.categoria === "presente" || l.diag.status === "em_intervalo";
    return l.categoria === statusFiltro;
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
        {visiveis.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">Nenhum colaborador para este filtro.</TableCell></TableRow>
        )}
        {visiveis
          .sort((a, b) => a.c.nome.localeCompare(b.c.nome))
          .map(({ c, regs, escala, diag, trab }) => {
            const ui = STATUS_UI[diag.status] || STATUS_UI.presente;
            const Icon = ui.icon;
            return (
              <TableRow key={c.id} className={`align-top hover:bg-muted/30 ${diag.exececao ? "bg-red-50/40" : ""}`}>
                <TableCell className="font-medium">
                  {diag.exececao && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 align-middle" />}
                  {c.nome}
                </TableCell>
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
                  <Badge className={`gap-1 ${ui.cls}`}>{Icon && <Icon className="w-3 h-3" />}{ui.label}</Badge>
                  {diag.status === "atraso" && diag.atraso_min > 0 && (
                    <span className="block text-amber-700 mt-1 text-[11px]">+{diag.atraso_min} min</span>
                  )}
                  {diag.status === "saida_antecipada" && diag.saida_antecipada_min > 0 && (
                    <span className="block text-amber-700 mt-1 text-[11px]">−{diag.saida_antecipada_min} min</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}