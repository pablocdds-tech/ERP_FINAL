import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageShell from "@/components/marketing/PageShell";
import { agruparPorCanal } from "@/lib/marketing-service";

export default function Performance() {
  const [pedidos, setPedidos] = useState([]);
  const [canais, setCanais] = useState([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.PedidoCliente.list(),
      base44.entities.CanalVenda.list(),
    ]).then(([p, c]) => { setPedidos(p); setCanais(c); });
  }, []);

  const filtrados = pedidos.filter((p) => {
    if (de && p.data && p.data < de) return false;
    if (ate && p.data && p.data > ate) return false;
    return true;
  });

  const linhas = agruparPorCanal(filtrados, canais);
  const totalReceita = linhas.reduce((s, r) => s + r.receita, 0);
  const totalPedidos = linhas.reduce((s, r) => s + r.pedidos, 0);

  return (
    <PageShell title="Performance por Canal" description="Receita, pedidos e ticket médio agrupados por canal de venda.">
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground mb-1">De</div>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Até</div>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pedidos</div><div className="text-2xl font-semibold">{totalPedidos}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Receita</div><div className="text-2xl font-semibold">R$ {totalReceita.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Ticket médio geral</div><div className="text-2xl font-semibold">R$ {totalPedidos > 0 ? (totalReceita / totalPedidos).toFixed(2) : "0,00"}</div></Card>
      </div>
      {linhas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Sem pedidos no período.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Ticket médio</TableHead>
                <TableHead>% Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((r) => (
                <TableRow key={r.canal_id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.pedidos}</TableCell>
                  <TableCell>R$ {r.receita.toFixed(2)}</TableCell>
                  <TableCell>R$ {r.ticket_medio.toFixed(2)}</TableCell>
                  <TableCell>{totalReceita > 0 ? ((r.receita / totalReceita) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}