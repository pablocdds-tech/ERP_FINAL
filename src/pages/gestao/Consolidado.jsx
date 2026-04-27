import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, calcularDRE } from "@/lib/gestao-service";

export default function Consolidado() {
  const [base, setBase] = useState(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Consolidado"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const total = calcularDRE({ base, lojaId: null, de, ate });
  const porLoja = base.lojas.map((l) => ({ loja: l, dre: calcularDRE({ base, lojaId: l.id, de, ate }) }));

  return (
    <PageShell title="Consolidado" description="Resultado de todas as lojas somadas no período.">
      <FiltrosPeriodo lojas={base.lojas} de={de} setDe={setDe} ate={ate} setAte={setAte} mostrarLoja={false} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Receita total" value={`R$ ${total.receita.toFixed(2)}`} tone="info" />
        <StatCard label="CMV total" value={`R$ ${total.cmv.toFixed(2)}`} sub={`${total.cmvPct.toFixed(1)}%`} />
        <StatCard label="Despesas total" value={`R$ ${total.despesas.toFixed(2)}`} />
        <StatCard label="Resultado consolidado"
          value={`R$ ${total.resultado.toFixed(2)}`}
          sub={`Margem ${total.margemLiquida.toFixed(1)}%`}
          tone={total.resultado >= 0 ? "positive" : "negative"}
          icon={total.resultado >= 0 ? TrendingUp : TrendingDown} />
      </div>

      <Card>
        <div className="p-4 border-b font-medium">DRE por loja</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loja</TableHead>
              <TableHead>Receita</TableHead>
              <TableHead>CMV</TableHead>
              <TableHead>Taxas</TableHead>
              <TableHead>Despesas</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porLoja.map((r) => (
              <TableRow key={r.loja.id}>
                <TableCell className="font-medium">{r.loja.nome}</TableCell>
                <TableCell>R$ {r.dre.receita.toFixed(2)}</TableCell>
                <TableCell>R$ {r.dre.cmv.toFixed(2)}</TableCell>
                <TableCell>R$ {r.dre.taxas.toFixed(2)}</TableCell>
                <TableCell>R$ {r.dre.despesas.toFixed(2)}</TableCell>
                <TableCell className={r.dre.resultado < 0 ? "text-red-600 font-medium" : "font-medium"}>
                  R$ {r.dre.resultado.toFixed(2)}
                </TableCell>
                <TableCell className={r.dre.margemLiquida < 0 ? "text-red-600" : ""}>
                  {r.dre.margemLiquida.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}