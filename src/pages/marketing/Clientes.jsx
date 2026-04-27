import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/marketing/PageShell";
import ClienteDialog from "@/components/marketing/ClienteDialog";
import { recalcularCliente } from "@/lib/marketing-service";

const STATUS_COLORS = {
  ativo: "bg-emerald-100 text-emerald-700",
  recorrente: "bg-blue-100 text-blue-700",
  vip: "bg-amber-100 text-amber-700",
  inativo: "bg-slate-100 text-slate-700",
  bloqueado: "bg-red-100 text-red-700",
};

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [busca, setBusca] = useState("");
  const [dlg, setDlg] = useState({ open: false, item: null });
  const [recalculando, setRecalculando] = useState(false);

  const load = async () => setItems(await base44.entities.Cliente.list("-ultima_compra"));
  useEffect(() => { load(); }, []);

  const recalcularTodos = async () => {
    setRecalculando(true);
    for (const c of items) await recalcularCliente(c.id);
    await load();
    setRecalculando(false);
  };

  const filtrados = items.filter((c) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return c.nome?.toLowerCase().includes(q) || c.telefone?.includes(busca) || c.email?.toLowerCase().includes(q);
  });

  return (
    <PageShell title="Clientes" description="Base de clientes com histórico, ticket médio e segmentação."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={recalcularTodos} disabled={recalculando}>
            <RefreshCw className={`w-4 h-4 mr-1 ${recalculando ? "animate-spin" : ""}`} /> Recalcular
          </Button>
          <Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
        </div>
      }>
      <div className="mb-3 relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, telefone ou email" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total gasto</TableHead>
                <TableHead>Ticket médio</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.telefone || c.email || "—"}</TableCell>
                  <TableCell>{c.total_pedidos || 0}</TableCell>
                  <TableCell>R$ {(c.total_gasto || 0).toFixed(2)}</TableCell>
                  <TableCell>R$ {(c.ticket_medio || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{c.ultima_compra ? format(new Date(c.ultima_compra), "dd/MM/yy") : "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDlg({ open: true, item: c })}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <ClienteDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })} item={dlg.item} onSaved={load} />
    </PageShell>
  );
}