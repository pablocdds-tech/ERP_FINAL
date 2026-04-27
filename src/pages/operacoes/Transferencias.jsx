import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Ban, ArrowRight } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import TransferenciaDialog from "@/components/operacoes/dialogs/TransferenciaDialog";
import { format } from "date-fns";

export default function Transferencias() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const [t, l] = await Promise.all([
      base44.entities.Transferencia.list("-data", 200),
      base44.entities.Loja.list(),
    ]);
    setItems(t || []);
    setLojas(l || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((t) => {
    if (statusFilter !== "todas" && t.status !== statusFilter) return false;
    if (search && !(t.numero || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, statusFilter]);

  const cancelar = async (t) => {
    await base44.entities.Transferencia.update(t.id, { status: "cancelada" });
    load();
  };

  return (
    <PageShell
      title="Transferências"
      description="Movimente itens entre lojas e CD."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova transferência
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
                <TableHead>Origem → Destino</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Nenhuma transferência.</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell>{t.data ? format(new Date(t.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{t.numero || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{lojaNome(t.loja_origem_id)}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span>{lojaNome(t.loja_destino_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{t.itens?.length || 0}</TableCell>
                  <TableCell><OperacaoStatusBadge status={t.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: t })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {t.status === "lancada" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelar(t)}>
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

      <TransferenciaDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        lojas={lojas}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}