import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import MovBancariaDialog from "@/components/financeiro/MovBancariaDialog";
import { format } from "date-fns";

const TIPO_LABEL = {
  credito: "Crédito",
  debito: "Débito",
  transferencia_entrada: "Transf. entrada",
  transferencia_saida: "Transf. saída",
  saldo_inicial: "Saldo inicial",
};

export default function Movimentacoes() {
  const [movs, setMovs] = useState([]);
  const [contas, setContas] = useState([]);
  const [search, setSearch] = useState("");
  const [contaFilter, setContaFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, record: null });

  const load = async () => {
    const [m, c] = await Promise.all([
      base44.entities.MovimentacaoBancaria.list("-data", 1000),
      base44.entities.ContaBancaria.list(),
    ]);
    setMovs(m); setContas(c);
  };
  useEffect(() => { load(); }, []);

  const contaNome = (id) => contas.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() => movs.filter((m) => {
    if (contaFilter !== "todas" && m.conta_bancaria_id !== contaFilter) return false;
    if (tipoFilter !== "todos" && m.tipo !== tipoFilter) return false;
    if (search && !`${m.descricao || ""} ${m.categoria_nome || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [movs, search, contaFilter, tipoFilter]);

  return (
    <PageShell
      title="Movimentações Bancárias"
      description="Extrato de cada conta bancária. Movimentações de baixas são geradas automaticamente."
      actions={<Button onClick={() => setDialog({ open: true, record: null })}><Plus className="w-4 h-4 mr-1.5" />Nova movimentação</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={contaFilter} onValueChange={setContaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as contas</SelectItem>
              {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Conciliada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma movimentação.</TableCell></TableRow>
              ) : filtered.map((m) => {
                const isCred = ["credito", "transferencia_entrada", "saldo_inicial"].includes(m.tipo);
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>{m.data ? format(new Date(m.data), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>{contaNome(m.conta_bancaria_id)}</TableCell>
                    <TableCell><span className="text-xs">{TIPO_LABEL[m.tipo] || m.tipo}</span></TableCell>
                    <TableCell className="font-medium">{m.descricao || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.categoria_nome || "—"}</TableCell>
                    <TableCell className={`text-right font-mono ${isCred ? "text-emerald-700" : "text-destructive"}`}>
                      {isCred ? "+" : "−"}R$ {Number(m.valor || 0).toFixed(2)}
                    </TableCell>
                    <TableCell><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.origem_tipo || "—"}</span></TableCell>
                    <TableCell>
                      {m.conciliada ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MovBancariaDialog
        open={dialog.open}
        record={dialog.record}
        onClose={() => setDialog({ open: false, record: null })}
        onSaved={load}
      />
    </PageShell>
  );
}