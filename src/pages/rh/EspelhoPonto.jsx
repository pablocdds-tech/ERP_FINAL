import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, MapPin } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import AfdActions from "@/components/rh/AfdActions";
import PainelPontoIndicadores from "@/components/rh/PainelPontoIndicadores";
import EventoPontoBadge from "@/components/rh/EventoPontoBadge";
import { calcularMinutosTrabalhados, diagnosticoDia, formatMinutos } from "@/lib/rh-service";
import { aprovarRegistroPonto } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

export default function EspelhoPonto() {
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [colId, setColId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataDe, setDataDe] = useState(hoje.slice(0, 8) + "01");
  const [dataAte, setDataAte] = useState(hoje);
  const [apenasFora, setApenasFora] = useState(false);
  const [lojaBatidaFiltro, setLojaBatidaFiltro] = useState("");

  const load = async () => {
    const [r, e, c, l] = await Promise.all([
      base44.entities.RegistroPonto.list("-horario", 5000),
      base44.entities.Escala.list("-data", 5000),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.Loja.list(),
    ]);
    setRegistros(r); setEscalas(e); setColaboradores(c); setLojas(l || []);
    if (!colId && c[0]) setColId(c[0].id);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const colaboradorAtual = colaboradores.find((c) => c.id === colId);
  const lojaPrincipal = lojas.find((l) => l.id === colaboradorAtual?.loja_id);
  const lojaMap = useMemo(() => Object.fromEntries(lojas.map((l) => [l.id, l])), [lojas]);

  const dias = useMemo(() => {
    if (!colId) return [];
    const map = new Map();
    for (const r of registros) {
      if (r.colaborador_id !== colId) continue;
      if (r.data < dataDe || r.data > dataAte) continue;
      if (apenasFora && !r.batida_fora_loja_principal) continue;
      if (lojaBatidaFiltro && (r.loja_batida_id || r.loja_id) !== lojaBatidaFiltro) continue;
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
  }, [registros, escalas, colId, dataDe, dataAte, apenasFora, lojaBatidaFiltro]);

  const totaisMin = dias.reduce((s, d) => s + calcularMinutosTrabalhados(d.registros), 0);

  const aprovarPendentes = async (regs) => {
    for (const r of regs.filter((x) => x.status === "pendente_revisao")) await aprovarRegistroPonto(r);
    load();
  };

  return (
    <PageShell title="Espelho de Ponto" description="Pontos normais são aprovados automaticamente. O gestor revisa apenas exceções.">
      <div className="mb-4">
        <PainelPontoIndicadores data={hoje} />
      </div>
      <AfdActions />
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <Select value={colId} onValueChange={setColId}>
            <SelectTrigger className="w-full md:w-[280px]"><SelectValue placeholder="Selecione colaborador" /></SelectTrigger>
            <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
          <Select value={lojaBatidaFiltro} onValueChange={setLojaBatidaFiltro}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Filtrar por loja da batida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas as lojas (batida)</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground md:ml-auto">
            <Switch checked={apenasFora} onCheckedChange={setApenasFora} />
            Apenas fora da loja principal
          </label>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            Loja principal:
            <span className="text-foreground font-medium">{lojaPrincipal?.nome || "—"}</span>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">Total trabalhado no período</span>
            <span className="font-mono font-semibold">{formatMinutos(totaisMin)}</span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead>
            <TableHead>Escala</TableHead>
            <TableHead>Eventos</TableHead>
            <TableHead>Loja(s) da batida</TableHead>
            <TableHead>Trabalhado</TableHead>
            <TableHead>Status do dia</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {dias.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem registros.</TableCell></TableRow>
            ) : dias.map((d) => {
              const diag = diagnosticoDia(d.escala, d.registros);
              const trab = calcularMinutosTrabalhados(d.registros);
              const pendentes = d.registros.filter((r) => r.status === "pendente_revisao");
              const lojasBatidaUnicas = [...new Set(d.registros.map((r) => r.loja_batida_id || r.loja_id).filter(Boolean))];
              const teveFora = d.registros.some((r) => r.batida_fora_loja_principal);
              return (
                <TableRow key={d.data} className="hover:bg-muted/30 align-top">
                  <TableCell className="whitespace-nowrap">{format(new Date(d.data), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-xs">
                    {d.escala ? (d.escala.tipo === "normal" ? `${d.escala.hora_entrada}–${d.escala.hora_saida}` : d.escala.tipo) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {d.registros
                        .sort((a, b) => a.horario.localeCompare(b.horario))
                        .map((r) => <EventoPontoBadge key={r.id} registro={r} lojas={lojas} />)}
                      {d.registros.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {lojasBatidaUnicas.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {lojasBatidaUnicas.map((id) => (
                          <span key={id} className="inline-flex items-center gap-1">
                            {lojaMap[id]?.nome || id}
                          </span>
                        ))}
                        {teveFora && (
                          <span className="inline-flex items-center gap-1 text-amber-700 text-[10px] mt-0.5">
                            <MapPin className="w-3 h-3" /> fora da principal
                          </span>
                        )}
                      </div>
                    )}
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