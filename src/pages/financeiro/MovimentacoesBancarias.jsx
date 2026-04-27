import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowUp, ArrowDown } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import MovBancariaDialog from "@/components/financeiro/MovBancariaDialog";
import { format } from "date-fns";

const TIPO_MAP = {
  credito: { label: "Crédito", positivo: true },
  debito: { label: "Débito", positivo: false },
  transferencia_entrada: { label: "Transf. entrada", positivo: true },
  transferencia_saida: { label: "Transf. saída", positivo: false },
  saldo_inicial: { label: "Saldo inicial", positivo: true },
};

export default function MovimentacoesBancarias() {
  const [movs, setMovs] = useState([]);
  const [contas, setContas] = useState([]);
  const [search, setSearch] = useState("");
  const [contaFilter, setContaFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dialog, setDialog] = useState(false);

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
      description="Extrato consolidado de todas as contas. Movimentações geradas por baixas, transferências e lançamentos manuais."
      actions={<Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-1.5" />Nova movimentação</Button>}
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
              {Object.entries(TIPO_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
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
                <TableHead>Conciliada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem movimentações.</TableCell></TableRow>
              ) : filtered.map((m) => {
                const t = TIPO_MAP[m.tipo] || { label: m.tipo, positivo: true };
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>{m.data ? format(new Date(m.data), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{contaNome(m.conta_bancaria_id)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        {t.positivo ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-destructive" />}
                        {t.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{m.descricao || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.categoria_nome || "—"}</TableCell>
                    <TableCell className={`text-right font-mono ${t.positivo ? "text-emerald-700" : "text-destructive"}`}>
                      {t.positivo ? "+" : "−"} R$ {Number(m.valor || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {m.conciliada ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">Sim</Badge> : <Badge variant="outline" className="font-normal">—</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MovBancariaDialog open={dialog} onClose={() => setDialog(false)} onSaved={load} />
    </PageShell>
  );
}