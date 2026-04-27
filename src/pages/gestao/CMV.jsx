import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, calcularCMV, calcularReceitaELoja } from "@/lib/gestao-service";

export default function CMV() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="CMV"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const consol = calcularCMV({ ...base, lojaId, de, ate });
  const recConsol = calcularReceitaELoja(base.fechamentos, lojaId, de, ate);

  // Por loja
  const porLoja = base.lojas.map((l) => {
    const r = calcularReceitaELoja(base.fechamentos, l.id, de, ate);
    const c = calcularCMV({ ...base, lojaId: l.id, de, ate });
    return { loja: l, receita: r.receita, cmv: c.cmv, cmvPct: c.cmvPct };
  });

  return (
    <PageShell title="CMV — Custo da Mercadoria Vendida" description="Custo estimado a partir das fichas técnicas e do CMV-alvo dos produtos.">
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Receita" value={`R$ ${recConsol.receita.toFixed(2)}`} />
        <StatCard label="CMV total" value={`R$ ${consol.cmv.toFixed(2)}`} />
        <StatCard label="CMV %" value={`${consol.cmvPct.toFixed(1)}%`} tone={consol.cmvPct > 35 ? "warn" : "positive"} />
        <StatCard label="CMV alvo médio" value={`${consol.cmvMedioAlvo.toFixed(1)}%`} sub="Configurado nos produtos" />
      </div>

      <Card>
        <div className="p-4 border-b font-medium">CMV por loja</div>
        {porLoja.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Sem lojas cadastradas.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Loja</TableHead><TableHead>Receita</TableHead><TableHead>CMV (R$)</TableHead><TableHead>CMV %</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {porLoja.map((r) => (
                <TableRow key={r.loja.id}>
                  <TableCell className="font-medium">{r.loja.nome}</TableCell>
                  <TableCell>R$ {r.receita.toFixed(2)}</TableCell>
                  <TableCell>R$ {r.cmv.toFixed(2)}</TableCell>
                  <TableCell className={r.cmvPct > 35 ? "text-amber-600 font-medium" : ""}>{r.cmvPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-3">
        ℹ️ CMV é estimado pela receita × % CMV-alvo médio. Para precisão maior, registre vendas por produto e fichas técnicas com custo de insumos atualizado.
      </p>
    </PageShell>
  );
}