import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/rh/PageShell";
import FiltroPeriodoLoja from "@/components/rh/FiltroPeriodoLoja";
import { formatMinutos } from "@/lib/rh-service";
import { carregarUniversoPonto } from "@/lib/relatorios-ponto-service";

function inicioMes() {
  const d = new Date();
  return {
    data_inicio: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
    data_fim: new Date().toISOString().slice(0, 10),
  };
}

export default function RelCartaoPonto() {
  const [filtros, setFiltros] = useState({ ...inicioMes(), loja_id: "" });
  const [colaboradorId, setColaboradorId] = useState("");
  const [universo, setUniverso] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => {
    setLoading(true);
    const u = await carregarUniversoPonto(filtros);
    setUniverso(u);
    if (!colaboradorId && u.linhas[0]) setColaboradorId(u.linhas[0].colaborador.id);
    setLoading(false);
  })(); }, [filtros.data_inicio, filtros.data_fim, filtros.loja_id]); // eslint-disable-line

  const linha = useMemo(() => universo?.linhas.find((l) => l.colaborador.id === colaboradorId), [universo, colaboradorId]);

  return (
    <PageShell title="Cartão de Ponto" description="Cartão individual com batidas e totais do período.">
      <FiltroPeriodoLoja {...filtros} lojas={universo?.lojas || []} onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
        extras={
          <Select value={colaboradorId || ""} onValueChange={setColaboradorId}>
            <SelectTrigger className="md:w-[280px]"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
            <SelectContent>
              {(universo?.linhas || []).map((l) => <SelectItem key={l.colaborador.id} value={l.colaborador.id}>{l.colaborador.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        } />

      {loading && <Card className="p-6 text-center text-sm text-muted-foreground">Calculando...</Card>}
      {!loading && linha && (
        <>
          <Card className="p-4 mb-4">
            <div className="text-sm font-semibold mb-2">{linha.colaborador.nome}</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <Bloco label="Esperado" valor={formatMinutos(linha.totais.esperado_min)} />
              <Bloco label="Trabalhado" valor={formatMinutos(linha.totais.trabalhado_min)} />
              <Bloco label="Saldo" valor={`${linha.totais.saldo_min >= 0 ? "+" : "−"}${formatMinutos(Math.abs(linha.totais.saldo_min))}`} tone={linha.totais.saldo_min >= 0 ? "text-emerald-700" : "text-destructive"} />
              <Bloco label="HE 50%" valor={formatMinutos(linha.totais.he50_min)} />
              <Bloco label="Atrasos" valor={formatMinutos(linha.totais.atraso_min)} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída Int.</TableHead>
                <TableHead>Volta Int.</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Trab.</TableHead>
                <TableHead>HE</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {linha.resumos.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Sem batidas no período.</TableCell></TableRow>
                ) : linha.resumos.map((r) => (
                  <TableRow key={r.data} className="text-xs">
                    <TableCell className="font-mono">{r.data}</TableCell>
                    <TableCell className="font-mono">{r.batidas?.entrada || "—"}</TableCell>
                    <TableCell className="font-mono">{r.batidas?.intervalo_saida || "—"}</TableCell>
                    <TableCell className="font-mono">{r.batidas?.intervalo_volta || "—"}</TableCell>
                    <TableCell className="font-mono">{r.batidas?.saida || "—"}</TableCell>
                    <TableCell className="font-mono">{formatMinutos(r.trabalhado_min)}</TableCell>
                    <TableCell className="font-mono">{formatMinutos((r.he50_min || 0) + (r.he100_min || 0))}</TableCell>
                    <TableCell className="font-mono">{formatMinutos(r.atraso_min || 0)}</TableCell>
                    <TableCell>{r.status || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </PageShell>
  );
}

function Bloco({ label, valor, tone }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`font-mono text-sm font-semibold ${tone || ""}`}>{valor}</span>
    </div>
  );
}