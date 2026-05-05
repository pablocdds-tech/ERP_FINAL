import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import AfdActions from "@/components/rh/AfdActions";
import PainelPontoIndicadores from "@/components/rh/PainelPontoIndicadores";
import { calcularMinutosTrabalhados, diagnosticoDia, formatMinutos, labelPonto } from "@/lib/rh-service";
import { aprovarRegistroPonto, rejeitarRegistroPonto } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

export default function EspelhoPonto() {
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [colId, setColId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataDe, setDataDe] = useState(hoje.slice(0, 8) + "01");
  const [dataAte, setDataAte] = useState(hoje);

  const load = async () => {
    const [r, e, c] = await Promise.all([
      base44.entities.RegistroPonto.list("-horario", 5000),
      base44.entities.Escala.list("-data", 5000),
      base44.entities.Colaborador.filter({ status: "ativo" }),
    ]);
    setRegistros(r); setEscalas(e); setColaboradores(c);
    if (!colId && c[0]) setColId(c[0].id);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const dias = useMemo(() => {
    if (!colId) return [];
    const map = new Map(); // data -> { data, registros: [], escala }
    for (const r of registros) {
      if (r.colaborador_id !== colId) continue;
      if (r.data < dataDe || r.data > dataAte) continue;
      const cur = map.get(r.data) || { data: r.data, registros: [], escala: null };
      cur.registros.push(r);
      map.set(r.data, cur);
    }
    for (const e of escalas) {
      if (e.colaborador_id !== colId) continue;
      if (e.data < dataDe || e.data > dataAte) continue;
      const cur = map.get(e.data) || { data: e.data, registros: [], escala: null };
      cur.escala = e;
      map.set(e.data, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  }, [registros, escalas, colId, dataDe, dataAte]);

  const totaisMin = dias.reduce((s, d) => s + calcularMinutosTrabalhados(d.registros), 0);

  // Pontos NORMAIS são aprovados automaticamente (status="registrado").
  // Aqui só revisamos EXCEÇÕES (status="pendente_revisao").
  const aprovarPendentes = async (regs) => {
    for (const r of regs.filter((x) => x.status === "pendente_revisao")) await aprovarRegistroPonto(r);
    load();
  };
  const rejeitar = async (r) => { await rejeitarRegistroPonto(r, "Rejeitado pelo gestor"); load(); };

  return (
    <PageShell title="Espelho de Ponto" description="Pontos normais são aprovados automaticamente. O gestor revisa apenas exceções.">
      <div className="mb-4">
        <PainelPontoIndicadores data={hoje} />
      </div>
      <AfdActions />
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={colId} onValueChange={setColId}>
            <SelectTrigger className="w-full md:w-[280px]"><SelectValue placeholder="Selecione colaborador" /></SelectTrigger>
            <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
          <span className="text-muted-foreground">Total trabalhado no período</span>
          <span className="font-mono font-semibold">{formatMinutos(totaisMin)}</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Escala</TableHead><TableHead>Eventos</TableHead>
            <TableHead>Trabalhado</TableHead><TableHead>Status do dia</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {dias.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem registros.</TableCell></TableRow>
            ) : dias.map((d) => {
              const diag = diagnosticoDia(d.escala, d.registros);
              const trab = calcularMinutosTrabalhados(d.registros);
              const pendentes = d.registros.filter((r) => r.status === "pendente_revisao");
              return (
                <TableRow key={d.data} className="hover:bg-muted/30 align-top">
                  <TableCell className="whitespace-nowrap">{format(new Date(d.data), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-xs">
                    {d.escala ? (d.escala.tipo === "normal" ? `${d.escala.hora_entrada}–${d.escala.hora_saida}` : d.escala.tipo) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {d.registros.sort((a, b) => a.horario.localeCompare(b.horario)).map((r) => {
                        const cls =
                          r.status === "rejeitado" ? "border-destructive/40 text-destructive line-through"
                          : r.status === "pendente_revisao" ? "border-amber-300 bg-amber-50 text-amber-800"
                          : r.ajustado ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800";
                        return (
                          <span key={r.id} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${cls}`}>
                            {labelPonto(r.tipo)}: {format(new Date(r.horario), "HH:mm")}
                          </span>
                        );
                      })}
                      {d.registros.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{formatMinutos(trab)}</TableCell>
                  <TableCell>
                    {diag.status === "falta" && <span className="text-destructive text-xs font-medium">Falta</span>}
                    {diag.status === "atraso" && <span className="text-amber-700 text-xs font-medium">Atraso {diag.atraso_min}min</span>}
                    {diag.status === "ok" && <span className="text-emerald-700 text-xs">OK</span>}
                    {diag.status === "sem_jornada" && <span className="text-muted-foreground text-xs">Sem jornada</span>}
                  </TableCell>
                  <TableCell>
                    {pendentes.length > 0 ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => aprovarPendentes(d.registros)}>
                          <Check className="w-3 h-3 mr-1" />Aprovar {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-700">Auto</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}