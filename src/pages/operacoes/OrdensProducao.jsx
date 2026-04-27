import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, CheckCircle2, Ban, PlayCircle } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import OrdemProducaoDialog from "@/components/operacoes/dialogs/OrdemProducaoDialog";
import { registrarMovimentacoes } from "@/lib/operacoes-service";
import { format } from "date-fns";

export default function OrdensProducao() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const [o, l, f] = await Promise.all([
      base44.entities.OrdemProducao.list("-data", 200),
      base44.entities.Loja.list(),
      base44.entities.FichaTecnica.list(),
    ]);
    setItems(o); setLojas(l); setFichas(f);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((o) => {
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (lojaFilter !== "todas" && o.loja_id !== lojaFilter) return false;
    if (search && !(`${o.numero || ""} ${o.produto_nome || ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [items, search, statusFilter, lojaFilter]);

  const iniciar = async (o) => {
    await base44.entities.OrdemProducao.update(o.id, { status: "em_producao" });
    load();
  };

  const finalizar = async (o) => {
    const ficha = fichas.find((f) => f.id === o.ficha_id);
    if (!ficha) return;
    const fator = (Number(o.quantidade_produzida) || Number(o.quantidade_planejada) || 0) / (Number(ficha.rendimento) || 1);

    const movs = [];
    // Saída de insumos
    for (const ing of ficha.ingredientes || []) {
      if (!ing.insumo_id) continue;
      movs.push({
        tipo: "producao_saida",
        item_tipo: "insumo",
        item_id: ing.insumo_id,
        item_nome: ing.insumo_nome,
        quantidade: Number(ing.quantidade) * fator,
        loja_id: o.loja_id,
        data: o.data,
        motivo: "Consumo de produção",
        origem_tipo: "producao",
        origem_id: o.id,
      });
    }
    // Entrada de produto acabado
    movs.push({
      tipo: "producao_entrada",
      item_tipo: "produto",
      item_id: o.produto_id,
      item_nome: o.produto_nome,
      quantidade: Number(o.quantidade_produzida) || Number(o.quantidade_planejada) || 0,
      loja_id: o.loja_id,
      data: o.data,
      motivo: "Produto acabado de produção",
      origem_tipo: "producao",
      origem_id: o.id,
    });

    await registrarMovimentacoes(movs);
    await base44.entities.OrdemProducao.update(o.id, {
      status: "finalizada",
      quantidade_produzida: Number(o.quantidade_produzida) || Number(o.quantidade_planejada) || 0,
    });
    load();
  };

  const cancelar = async (o) => {
    await base44.entities.OrdemProducao.update(o.id, { status: "cancelada" });
    load();
  };

  return (
    <PageShell
      title="Ordens de Produção"
      description="Abra ordens com base em fichas técnicas. Ao finalizar, o sistema consome insumos e gera produto acabado."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova ordem
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="em_producao">Em produção</SelectItem>
              <SelectItem value="finalizada">Finalizadas</SelectItem>
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
                <TableHead>Produto</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Planejado</TableHead>
                <TableHead>Produzido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma ordem.</TableCell></TableRow>
              ) : filtered.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/30">
                  <TableCell>{o.data ? format(new Date(o.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{o.numero || "—"}</TableCell>
                  <TableCell>{o.produto_nome}</TableCell>
                  <TableCell>{lojaNome(o.loja_id)}</TableCell>
                  <TableCell>{o.quantidade_planejada}</TableCell>
                  <TableCell>{o.quantidade_produzida ?? "—"}</TableCell>
                  <TableCell><OperacaoStatusBadge status={o.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: o })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {o.status === "aberta" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => iniciar(o)} title="Iniciar">
                          <PlayCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {(o.status === "aberta" || o.status === "em_producao") && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => finalizar(o)} title="Finalizar">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelar(o)} title="Cancelar">
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <OrdemProducaoDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        fichas={fichas}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}