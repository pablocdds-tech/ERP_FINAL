import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, dentroPeriodo } from "@/lib/gestao-service";

export default function RelatoriosFinanceiros() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Relatórios Financeiros"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  // Filtra contas (apenas reais, sem Banco Virtual)
  const cp = base.contasPagar
    .filter((c) => !c.banco_virtual && c.tipo_origem !== "interno")
    .filter((c) => !lojaId || c.loja_id === lojaId);

  const pagas = cp.filter((c) => (c.status === "pago" || c.status === "baixado") && dentroPeriodo(c.data_pagamento || c.data_vencimento, de, ate));
  const abertas = cp.filter((c) => c.status === "aberto");
  const vencidas = abertas.filter((c) => c.data_vencimento && c.data_vencimento < hoje);

  const totalPago = pagas.reduce((s, c) => s + (Number(c.valor_pago) || Number(c.valor) || 0), 0);
  const totalAberto = abertas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalVencido = vencidas.reduce((s, c) => s + (Number(c.valor) || 0), 0);

  // Por categoria
  const porCat = new Map();
  pagas.forEach((c) => {
    const k = c.categoria_id || "outros";
    porCat.set(k, (porCat.get(k) || 0) + (Number(c.valor_pago) || Number(c.valor) || 0));
  });
  const linhas = Array.from(porCat.entries())
    .map(([id, v]) => ({ nome: base.categorias.find((cat) => cat.id === id)?.nome || "Sem categoria", valor: v }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <PageShell title="Relatórios Financeiros" description="Contas reais pagas, abertas e vencidas. Não inclui Banco Virtual.">
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatCard label="Pago no período" value={`R$ ${totalPago.toFixed(2)}`} sub={`${pagas.length} conta(s)`} />
        <StatCard label="Em aberto" value={`R$ ${totalAberto.toFixed(2)}`} sub={`${abertas.length} conta(s)`} />
        <StatCard label="Vencidas" value={`R$ ${totalVencido.toFixed(2)}`} sub={`${vencidas.length} conta(s)`} tone={totalVencido > 0 ? "negative" : "default"} />
      </div>

      <Card>
        <div className="p-4 border-b font-medium">Despesas pagas por categoria</div>
        {linhas.length === 0 ? (
          <div className="p-6 text-sm text-center text-muted-foreground">Sem despesas pagas no período.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
            <TableBody>
              {linhas.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.nome}</TableCell>
                  <TableCell>R$ {l.valor.toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{totalPago > 0 ? ((l.valor / totalPago) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageShell>
  );
}