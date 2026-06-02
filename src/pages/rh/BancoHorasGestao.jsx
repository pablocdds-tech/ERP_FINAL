import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import FiltroPeriodoLoja from "@/components/rh/FiltroPeriodoLoja";
import BancoHorasDetalhe from "@/components/rh/BancoHorasDetalhe";
import { formatMinutos } from "@/lib/rh-service";
import { carregarUniversoPonto } from "@/lib/relatorios-ponto-service";

function ultimoMes() {
  const d = new Date();
  return {
    data_inicio: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
    data_fim: new Date().toISOString().slice(0, 10),
  };
}

export default function BancoHorasGestao() {
  const ini = ultimoMes();
  const [filtros, setFiltros] = useState({ ...ini, loja_id: "" });
  const [universo, setUniverso] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aberto, setAberto] = useState(null); // id do colaborador expandido

  useEffect(() => { (async () => {
    setLoading(true);
    const u = await carregarUniversoPonto(filtros);
    setUniverso(u); setLoading(false);
  })(); }, [filtros.data_inicio, filtros.data_fim, filtros.loja_id]); // eslint-disable-line

  const linhas = useMemo(() => {
    if (!universo) return [];
    return universo.linhas
      .map((l) => ({
        id: l.colaborador.id,
        nome: l.colaborador.nome,
        esperado: l.totais.esperado_min,
        trabalhado: l.totais.trabalhado_min,
        saldo: l.totais.saldo_min,
        he50: l.totais.he50_min,
        he100: l.totais.he100_min,
        faltas: l.totais.faltas,
        atrasos: l.totais.atrasos,
        resumos: l.resumos,
      }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [universo]);

  const totais = linhas.reduce((a, l) => ({
    esperado: a.esperado + l.esperado, trabalhado: a.trabalhado + l.trabalhado,
    saldo: a.saldo + l.saldo, he50: a.he50 + l.he50, he100: a.he100 + l.he100,
  }), { esperado: 0, trabalhado: 0, saldo: 0, he50: 0, he100: 0 });

  return (
    <PageShell title="Saldo de Banco de Horas" description="Saldo individual de horas no período. Clique numa linha para ver a origem do saldo.">
      <FiltroPeriodoLoja {...filtros} lojas={universo?.lojas || []} onChange={(p) => setFiltros((f) => ({ ...f, ...p }))} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="w-8"></TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Esperado</TableHead>
            <TableHead>Trabalhado</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>HE 50%</TableHead>
            <TableHead>HE 100%</TableHead>
            <TableHead className="text-center">Faltas</TableHead>
            <TableHead className="text-center">Atrasos</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Calculando...</TableCell></TableRow>
            ) : linhas.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Sem dados no período.</TableCell></TableRow>
            ) : <>
              {linhas.map((l) => {
                const expandido = aberto === l.id;
                return (
                  <>
                    <TableRow key={l.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setAberto(expandido ? null : l.id)}>
                      <TableCell className="text-muted-foreground">{expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell className="font-mono">{formatMinutos(l.esperado)}</TableCell>
                      <TableCell className="font-mono">{formatMinutos(l.trabalhado)}</TableCell>
                      <TableCell className={`font-mono ${l.saldo >= 0 ? "text-emerald-700" : "text-destructive"}`}>{l.saldo >= 0 ? "+" : "−"}{formatMinutos(Math.abs(l.saldo))}</TableCell>
                      <TableCell className="font-mono">{formatMinutos(l.he50)}</TableCell>
                      <TableCell className="font-mono">{formatMinutos(l.he100)}</TableCell>
                      <TableCell className="text-center">{l.faltas || 0}</TableCell>
                      <TableCell className="text-center">{l.atrasos || 0}</TableCell>
                    </TableRow>
                    {expandido && (
                      <TableRow key={`${l.id}-det`}>
                        <TableCell colSpan={9} className="p-0">
                          <BancoHorasDetalhe resumos={l.resumos} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              <TableRow className="bg-muted/60 font-semibold">
                <TableCell></TableCell>
                <TableCell>Total</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.esperado)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.trabalhado)}</TableCell>
                <TableCell className={`font-mono ${totais.saldo >= 0 ? "text-emerald-700" : "text-destructive"}`}>{totais.saldo >= 0 ? "+" : "−"}{formatMinutos(Math.abs(totais.saldo))}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.he50)}</TableCell>
                <TableCell className="font-mono">{formatMinutos(totais.he100)}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}