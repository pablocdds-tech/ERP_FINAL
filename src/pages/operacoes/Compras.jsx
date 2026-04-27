import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Ban } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import CompraDialog from "@/components/operacoes/dialogs/CompraDialog";
import { format } from "date-fns";

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const [c, f, l] = await Promise.all([
      base44.entities.Compra.list("-data", 200),
      base44.entities.Fornecedor.list(),
      base44.entities.Loja.list(),
    ]);
    setCompras(c || []);
    setFornecedores(f || []);
    setLojas(l || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fornecedorNome = (id) => fornecedores.find((f) => f.id === id)?.nome || "—";
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => {
    return compras.filter((c) => {
      if (statusFilter !== "todas" && c.status !== statusFilter) return false;
      if (lojaFilter !== "todas" && c.loja_id !== lojaFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!`${c.numero || ""} ${fornecedorNome(c.fornecedor_id)}`.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [compras, search, statusFilter, lojaFilter, fornecedores]);

  const cancelar = async (c) => {
    await base44.entities.Compra.update(c.id, { status: "cancelada" });
    load();
  };

  return (
    <PageShell
      title="Compras"
      description="Lance compras e gere entradas de estoque automaticamente."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova compra
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por número ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos status</SelectItem>
              <SelectItem value="lancada">Lançadas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma compra encontrada.</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>{c.data ? format(new Date(c.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{c.numero || "—"}</TableCell>
                  <TableCell>{fornecedorNome(c.fornecedor_id)}</TableCell>
                  <TableCell>{lojaNome(c.loja_id)}</TableCell>
                  <TableCell>{c.itens?.length || 0}</TableCell>
                  <TableCell>R$ {Number(c.valor_total || 0).toFixed(2)}</TableCell>
                  <TableCell><OperacaoStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: c })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {c.status === "lancada" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelar(c)} title="Cancelar">
                          <Ban className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <CompraDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}