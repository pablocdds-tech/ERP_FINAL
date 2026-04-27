import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, ClipboardCheck } from "lucide-react";
import PageShell from "@/components/vendas/PageShell";
import FechamentoStatusBadge from "@/components/vendas/FechamentoStatusBadge";
import FechamentoDialog from "@/components/vendas/FechamentoDialog";
import { format } from "date-fns";

export default function Fechamentos() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const [f, l] = await Promise.all([
      base44.entities.FechamentoDiario.list("-data", 200),
      base44.entities.Loja.list(),
    ]);
    setItems(f); setLojas(l);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((f) => {
    if (statusFilter !== "todos" && f.status !== statusFilter) return false;
    if (lojaFilter !== "todas" && f.loja_id !== lojaFilter) return false;
    if (search && !lojaNome(f.loja_id).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, statusFilter, lojaFilter, lojas]);

  return (
    <PageShell
      title="Fechamentos diários"
      description="Lance o resumo do dia, confira pagamentos e feche o caixa."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo fechamento
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por loja..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="conferido">Conferido</SelectItem>
              <SelectItem value="divergente">Divergente</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
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
                <TableHead>Loja</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Conferido</TableHead>
                <TableHead className="text-right">Divergência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  <ClipboardCheck className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Nenhum fechamento ainda. Lance o primeiro.
                </TableCell></TableRow>
              ) : filtered.map((f) => {
                const div = Number(f.divergencia || 0);
                return (
                  <TableRow key={f.id} className="hover:bg-muted/30">
                    <TableCell>{f.data ? format(new Date(f.data), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="font-medium">{lojaNome(f.loja_id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.responsavel || "—"}</TableCell>
                    <TableCell className="text-right font-mono">R$ {Number(f.total_vendas || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">R$ {Number(f.total_pagamentos_conferido || 0).toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono ${Math.abs(div) > 0.001 ? "text-amber-700" : "text-muted-foreground"}`}>
                      R$ {div.toFixed(2)}
                    </TableCell>
                    <TableCell><FechamentoStatusBadge status={f.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: f })}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {f.status !== "fechado" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "conferir", record: f })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <FechamentoDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}