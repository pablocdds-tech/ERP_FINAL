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

export default function RelHorasExtras() {
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
        he50: l.totais.he50_min || 0,
        he100: l.totais.he100_min || 0,
        noturno: l.totais.noturno_ficto_min || 0,
        total: (l.totais.he50_min || 0) + (l.totais.he100_min || 0),
      }))
      .filter((l) => l.total > 0 || l.noturno > 0)
      .sort((a, b) => b.total - a.total);
  }, [universo]);

  const totais = linhas.reduce((a, l) => ({
    he50: a.he50 + l.he50, he100: a.he100 + l.he100, noturno: a.noturno + l.noturno, total: a.total + l.total,
  }), { he50: 0, he100: 0, noturno: 0, total: 0 });

  return (
    <PageShell title="Horas Extras" description="HE 50%, 100% e adicional noturno no período.">
      <FiltroPeriodoLoja {...filtros} lojas={universo?.lojas || []} onChange={(p) => setFiltros((f) => ({ ...f, ...p }))} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Colaborador</TableHead>
            <TableHead>HE 50%</TableHead>
            <TableHead>HE 100%</TableHead>
            <TableHead>Total HE</TableHead>
            <TableHead>Noturno</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Calculando...</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">Sem horas extras no período.</TableCell></TableRow>
            ) : <>
              {linhas.map((l) => (
                <TableRow key={l.nome} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="font-mono">{formatMinutos(l.he50)}</TableCell>
                  <TableCell className="font-mono">{formatMinutos(l.he100)}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatMinutos(l.total)}</TableCell>
                  <TableCell className="font-mono">{formatMinutos(l.noturno)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/60 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.he50)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.he100)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.total)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.noturno)}</TableCell>
              </TableRow>
            </>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}