import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, ArrowRight } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import ContaStatusBadge from "@/components/financeiro/ContaStatusBadge";
import LancamentoInternoDialog from "@/components/financeiro/LancamentoInternoDialog";
import { format } from "date-fns";

const TIPO_LABEL = {
  debito: "Débito",
  credito: "Crédito",
  liquidacao: "Liquidação",
};

export default function InternoLancamentos() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null, tipoSugerido: "debito" });

  const load = async () => {
    const [l, lj] = await Promise.all([
      base44.entities.LancamentoInterno.list("-data", 500),
      base44.entities.Loja.list(),
    ]);
    setItems(l); setLojas(lj);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((l) => {
    if (tipoFilter !== "todos" && l.tipo !== tipoFilter) return false;
    if (statusFilter !== "todos" && l.status !== statusFilter) return false;
    if (search && !`${l.descricao || ""} ${l.categoria || ""} ${l.cupom_numero || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, tipoFilter, statusFilter, search]);

  return (
    <PageShell
      title="Lançamentos Internos"
      description="Débitos e créditos entre CD e lojas. Não inflam receita real."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog({ open: true, mode: "create", record: null, tipoSugerido: "credito" })}>
            <Plus className="w-4 h-4 mr-1.5" /> Crédito
          </Button>
          <Button onClick={() => setDialog({ open: true, mode: "create", record: null, tipoSugerido: "debito" })}>
            <Plus className="w-4 h-4 mr-1.5" /> Débito
          </Button>
        </div>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="liquidacao">Liquidação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="liquidado">Liquidado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
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
                <TableHead>Cupom</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>De → Para</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem lançamentos.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30">
                  <TableCell>{l.data ? format(new Date(l.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.cupom_numero || "—"}</TableCell>
                  <TableCell>{TIPO_LABEL[l.tipo] || l.tipo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span>{lojaNome(l.loja_origem_id)}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span>{lojaNome(l.loja_destino_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.descricao || "—"}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(l.valor || 0).toFixed(2)}</TableCell>
                  <TableCell><ContaStatusBadge status={l.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: l })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "edit", record: l })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <LancamentoInternoDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        tipoSugerido={dialog.tipoSugerido}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}