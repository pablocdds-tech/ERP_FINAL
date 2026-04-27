import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import InventarioDialog from "@/components/operacoes/dialogs/InventarioDialog";
import { format } from "date-fns";

export default function Inventarios() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const [i, l] = await Promise.all([
      base44.entities.Inventario.list("-data", 200),
      base44.entities.Loja.list(),
    ]);
    setItems(i); setLojas(l);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((i) => {
    if (statusFilter !== "todas" && i.status !== statusFilter) return false;
    if (search && !(i.numero || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, statusFilter]);

  return (
    <PageShell
      title="Inventários"
      description="Contagens cíclicas. O funcionário só vê o item e registra a quantidade contada — sem ver saldo esperado."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo inventário
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos status</SelectItem>
              <SelectItem value="em_contagem">Em contagem</SelectItem>
              <SelectItem value="fechado">Fechados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
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
                <TableHead>Loja</TableHead>
                <TableHead>Itens contados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Nenhum inventário.</TableCell></TableRow>
              ) : filtered.map((i) => (
                <TableRow key={i.id} className="hover:bg-muted/30">
                  <TableCell>{i.data ? format(new Date(i.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{i.numero || "—"}</TableCell>
                  <TableCell>{lojaNome(i.loja_id)}</TableCell>
                  <TableCell>{i.itens?.length || 0}</TableCell>
                  <TableCell><OperacaoStatusBadge status={i.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: i.status === "em_contagem" ? "edit" : "view", record: i })}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <InventarioDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}