import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import PageShell from "@/components/marketing/PageShell";

export default function Ranking() {
  const [clientes, setClientes] = useState([]);
  useEffect(() => { base44.entities.Cliente.list("-total_gasto", 50).then(setClientes); }, []);

  const top = clientes.filter((c) => (c.total_gasto || 0) > 0);

  return (
    <PageShell title="Ranking de Clientes" description="Top 50 clientes por valor gasto.">
      {top.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Sem dados de pedidos. Cadastre PedidoCliente para alimentar o ranking.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total gasto</TableHead>
                <TableHead>Ticket médio</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {i < 3 ? <Trophy className={`w-4 h-4 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-orange-600"}`} /> : <span className="text-muted-foreground">{i + 1}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.total_pedidos || 0}</TableCell>
                  <TableCell className="font-semibold">R$ {(c.total_gasto || 0).toFixed(2)}</TableCell>
                  <TableCell>R$ {(c.ticket_medio || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}