import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, dentroPeriodo } from "@/lib/gestao-service";

export default function RelatoriosOperacionais() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Relatórios Operacionais"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const fs = base.fechamentos.filter((f) =>
    (!lojaId || f.loja_id === lojaId) && dentroPeriodo(f.data, de, ate)
  );
  const totalReceita = fs.reduce((s, f) => s + (Number(f.total_vendas) || 0), 0);
  const ticketMedio = fs.length > 0 ? totalReceita / fs.length : 0;
  const totalSangrias = fs.reduce((s, f) => s + (Number(f.total_sangrias) || 0), 0);

  // Por canal (a partir de fechamentos com breakdown)
  const porCanal = new Map();
  fs.forEach((f) => {
    (f.vendas_por_canal || []).forEach((c) => {
      const k = c.canal_id || "outros";
      porCanal.set(k, (porCanal.get(k) || 0) + (Number(c.valor) || 0));
    });
  });
  const linhasCanal = Array.from(porCanal.entries())
    .map(([id, valor]) => ({ nome: base.canais.find((c) => c.id === id)?.nome || "Outros", valor }))
    .sort((a, b) => b.valor - a.valor);

  // Por forma de pagamento
  const porForma = new Map();
  fs.forEach((f) => {
    (f.vendas_por_pagamento || []).forEach((p) => {
      const k = p.forma_pagamento_id || "outros";
      porForma.set(k, (porForma.get(k) || 0) + (Number(p.valor) || 0));
    });
  });
  const linhasForma = Array.from(porForma.entries())
    .map(([id, valor]) => ({ nome: base.formasPagamento.find((f) => f.id === id)?.nome || "Outros", valor }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <PageShell title="Relatórios Operacionais" description="Vendas, ticket médio e quebras por canal e forma de pagamento.">
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Dias com vendas" value={fs.length} />
        <StatCard label="Receita" value={`R$ ${totalReceita.toFixed(2)}`} />
        <StatCard label="Ticket médio (dia)" value={`R$ ${ticketMedio.toFixed(2)}`} />
        <StatCard label="Sangrias" value={`R$ ${totalSangrias.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 border-b font-medium">Vendas por canal</div>
          {linhasCanal.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Sem dados detalhados.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Canal</TableHead><TableHead>Valor</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
              <TableBody>
                {linhasCanal.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.nome}</TableCell>
                    <TableCell>R$ {l.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{totalReceita > 0 ? ((l.valor / totalReceita) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="p-4 border-b font-medium">Vendas por forma de pagamento</div>
          {linhasForma.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Sem dados detalhados.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Forma</TableHead><TableHead>Valor</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
              <TableBody>
                {linhasForma.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.nome}</TableCell>
                    <TableCell>R$ {l.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{totalReceita > 0 ? ((l.valor / totalReceita) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}