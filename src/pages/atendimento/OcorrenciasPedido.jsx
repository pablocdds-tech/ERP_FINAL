import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import StatusBadge from "@/components/atendimento/StatusBadge";
import { motivoLabel } from "@/lib/atendimento-config";

export default function OcorrenciasPedido() {
  const [items, setItems] = useState([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    base44.entities.Reclamacao.list("-data").then((r) => {
      setItems(r.filter((x) => x.pedido_referencia));
    });
  }, []);

  const filtrados = items.filter((r) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return r.pedido_referencia?.includes(busca) || r.titulo?.toLowerCase().includes(q) || r.cliente_nome?.toLowerCase().includes(q);
  });

  return (
    <PageShell title="Ocorrências de Pedido" description="Reclamações vinculadas a um pedido específico (iFood, balcão, delivery próprio).">
      <div className="relative max-w-sm mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar pedido, cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma ocorrência de pedido registrada.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Compensação</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.pedido_referencia}</TableCell>
                  <TableCell className="text-xs">{r.data && format(new Date(r.data), "dd/MM/yy")}</TableCell>
                  <TableCell className="text-xs">{r.cliente_nome || "—"}</TableCell>
                  <TableCell className="text-xs">{motivoLabel(r.motivo)}</TableCell>
                  <TableCell>{r.valor_pedido ? `R$ ${r.valor_pedido.toFixed(2)}` : "—"}</TableCell>
                  <TableCell>{r.valor_compensacao ? `R$ ${r.valor_compensacao.toFixed(2)}` : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status_tratativa} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}