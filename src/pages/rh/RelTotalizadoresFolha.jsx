import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
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

function exportarCSV(linhas, periodo) {
  const header = ["Colaborador", "Esperado (min)", "Trabalhado (min)", "Saldo (min)", "HE 50% (min)", "HE 100% (min)", "Noturno (min)", "Atraso (min)", "Faltas"];
  const rows = linhas.map((l) => [
    `"${l.colaborador.nome.replace(/"/g, '""')}"`,
    l.totais.esperado_min, l.totais.trabalhado_min, l.totais.saldo_min,
    l.totais.he50_min, l.totais.he100_min, l.totais.noturno_ficto_min || 0,
    l.totais.atraso_min, l.totais.faltas || 0,
  ].join(";"));
  const csv = [header.join(";"), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `totalizadores-folha-${periodo}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function RelTotalizadoresFolha() {
  const [filtros, setFiltros] = useState({ ...inicioMes(), loja_id: "" });
  const [universo, setUniverso] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => {
    setLoading(true);
    const u = await carregarUniversoPonto(filtros);
    setUniverso(u); setLoading(false);
  })(); }, [filtros.data_inicio, filtros.data_fim, filtros.loja_id]); // eslint-disable-line

  const linhas = useMemo(() => (universo?.linhas || []).filter((l) => l.totais.trabalhado_min > 0 || (l.totais.faltas || 0) > 0), [universo]);

  return (
    <PageShell
      title="Totalizadores para Folha"
      description="Resumo consolidado por colaborador, pronto para enviar ao contador."
      actions={
        <Button variant="outline" onClick={() => exportarCSV(linhas, `${filtros.data_inicio}_${filtros.data_fim}`)} disabled={linhas.length === 0} className="gap-2">
          <Download className="w-4 h-4" />Exportar CSV
        </Button>
      }
    >
      <FiltroPeriodoLoja {...filtros} lojas={universo?.lojas || []} onChange={(p) => setFiltros((f) => ({ ...f, ...p }))} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Colaborador</TableHead>
            <TableHead>Esperado</TableHead>
            <TableHead>Trabalhado</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>HE 50%</TableHead>
            <TableHead>HE 100%</TableHead>
            <TableHead>Noturno</TableHead>
            <TableHead>Atraso</TableHead>
            <TableHead className="text-center">Faltas</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Calculando...</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Sem dados no período.</TableCell></TableRow>
            ) : linhas.map((l) => (
              <TableRow key={l.colaborador.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{l.colaborador.nome}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.esperado_min)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.trabalhado_min)}</TableCell>
                <TableCell className={`font-mono ${l.totais.saldo_min >= 0 ? "text-emerald-700" : "text-destructive"}`}>{l.totais.saldo_min >= 0 ? "+" : "−"}{formatMinutos(Math.abs(l.totais.saldo_min))}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.he50_min)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.he100_min)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.noturno_ficto_min || 0)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.totais.atraso_min)}</TableCell>
                <TableCell className="text-center">{l.totais.faltas || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}