import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function RelFaltasAtrasos() {
  const [filtros, setFiltros] = useState({ ...inicioMes(), loja_id: "" });
  const [universo, setUniverso] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => {
    setLoading(true);
    const u = await carregarUniversoPonto(filtros);
    setUniverso(u); setLoading(false);
  })(); }, [filtros.data_inicio, filtros.data_fim, filtros.loja_id]); // eslint-disable-line

  const linhas = useMemo(() => {
    if (!universo) return [];
    return universo.linhas
      .map((l) => ({
        nome: l.colaborador.nome,
        faltas: l.totais.faltas || 0,
        atrasos_dias: l.resumos.filter((r) => (r.atraso_min || 0) > 0).length,
        atraso_min: l.totais.atraso_min || 0,
        saida_antec_min: l.totais.saida_antecipada_min || 0,
      }))
      .filter((l) => l.faltas > 0 || l.atrasos_dias > 0 || l.saida_antec_min > 0)
      .sort((a, b) => b.faltas - a.faltas || b.atraso_min - a.atraso_min);
  }, [universo]);

  return (
    <PageShell title="Faltas e Atrasos" description="Resumo de ausências, atrasos e saídas antecipadas no período.">
      <FiltroPeriodoLoja {...filtros} lojas={universo?.lojas || []} onChange={(p) => setFiltros((f) => ({ ...f, ...p }))} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Colaborador</TableHead>
            <TableHead className="text-center">Faltas</TableHead>
            <TableHead className="text-center">Dias c/ atraso</TableHead>
            <TableHead>Total de atraso</TableHead>
            <TableHead>Saída antecipada</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Calculando...</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Nenhuma falta ou atraso no período 🎉</TableCell></TableRow>
            ) : linhas.map((l) => (
              <TableRow key={l.nome} className="hover:bg-muted/30">
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-center">{l.faltas}</TableCell>
                <TableCell className="text-center">{l.atrasos_dias}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.atraso_min)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(l.saida_antec_min)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}