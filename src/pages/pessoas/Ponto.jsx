import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { calcularMinutosTrabalhados, formatMinutos, diagnosticoDia, labelPonto } from "@/lib/rh-service";
import { aprovarRegistroPonto, rejeitarRegistroPonto } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

export default function Ponto() {
  const [colaboradores, setColaboradores] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [colId, setColId] = useState("");
  const hoje = new Date();
  const [dataDe, setDataDe] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [dataAte, setDataAte] = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([
      base44.entities.Colaborador.list("nome", 500),
      base44.entities.RegistroPonto.list("-horario", 5000),
      base44.entities.Escala.list("data", 5000),
    ]).then(([c, r, e]) => {
      setColaboradores(c); setRegistros(r); setEscalas(e);
      if (!colId && c[0]) setColId(c[0].id);
    });
  }, []);

  const reload = async () => {
    setRegistros(await base44.entities.RegistroPonto.list("-horario", 5000));
  };

  const dias = useMemo(() => {
    if (!colId) return [];
    const regs = registros.filter((r) => r.colaborador_id === colId && r.data >= dataDe && r.data <= dataAte);
    const escs = escalas.filter((e) => e.colaborador_id === colId && e.data >= dataDe && e.data <= dataAte);
    const datas = new Set([...regs.map((r) => r.data), ...escs.map((e) => e.data)]);
    return Array.from(datas).sort().reverse().map((data) => {
      const regsDia = regs.filter((r) => r.data === data);
      const esc = escs.find((e) => e.data === data);
      const min = calcularMinutosTrabalhados(regsDia);
      const diag = diagnosticoDia(esc, regsDia);
      return { data, regsDia, esc, min, diag };
    });
  }, [colId, registros, escalas, dataDe, dataAte]);

  const totalMin = dias.reduce((s, d) => s + d.min, 0);
  const totalAtraso = dias.reduce((s, d) => s + (d.diag.atraso_min || 0), 0);
  const faltas = dias.filter((d) => d.diag.status === "falta").length;

  return (
    <PageShell title="Espelho de Ponto" description="Registros de ponto, atrasos, faltas e horas trabalhadas.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={colId} onValueChange={setColId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Colaborador" /></SelectTrigger>
            <SelectContent>
              {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border text-sm">
          <Resumo label="Horas trabalhadas" valor={formatMinutos(totalMin)} />
          <Resumo label="Atraso acumulado" valor={formatMinutos(totalAtraso)} cor="text-amber-700" />
          <Resumo label="Faltas" valor={faltas} cor="text-destructive" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Eventos</TableHead>
              <TableHead className="text-right">Trabalhadas</TableHead>
              <TableHead className="text-right">Atraso</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dias.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem dados no período.</TableCell></TableRow>
            ) : dias.map((d) => (
              <TableRow key={d.data}>
                <TableCell>{format(new Date(d.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                <TableCell><DiagBadge diag={d.diag} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {d.regsDia.map((r) => (
                      <span key={r.id} className={`text-[11px] px-1.5 py-0.5 rounded border ${r.status === "rejeitado" ? "bg-red-50 border-red-200 text-red-700" : r.status === "aprovado" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-muted border-border"}`}>
                        {labelPonto(r.tipo)}: {format(new Date(r.horario), "HH:mm")}
                        {r.ajustado && <span title="Ajustado pelo gestor"> *</span>}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatMinutos(d.min)}</TableCell>
                <TableCell className="text-right font-mono text-amber-700">{d.diag.atraso_min ? formatMinutos(d.diag.atraso_min) : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {d.regsDia.filter((r) => r.status === "registrado").map((r) => (
                      <span key={r.id} className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Aprovar" onClick={async () => { await aprovarRegistroPonto(r); reload(); }}>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Rejeitar" onClick={async () => {
                          const m = prompt("Motivo:");
                          if (m !== null) { await rejeitarRegistroPonto(r, m); reload(); }
                        }}>
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}

function Resumo({ label, valor, cor }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-medium text-base ${cor || ""}`}>{valor}</div>
    </div>
  );
}

function DiagBadge({ diag }) {
  const map = {
    ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    atraso: { label: `Atraso`, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    falta: { label: "Falta", cls: "bg-red-50 text-red-700 border-red-200" },
    sem_jornada: { label: "—", cls: "" },
  };
  const c = map[diag.status] || map.sem_jornada;
  return <Badge variant="outline" className={`font-normal ${c.cls}`}>{c.label}</Badge>;
}