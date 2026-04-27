import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import { format } from "date-fns";

const TIPO_LABEL = {
  entrada: "Entrada",
  saida: "Saída",
  transferencia_saida: "Transf. saída",
  transferencia_entrada: "Transf. entrada",
  ajuste: "Ajuste",
  perda: "Perda",
  producao_entrada: "Produção (entrada)",
  producao_saida: "Produção (saída)",
  inventario: "Inventário",
};

export default function Movimentacoes() {
  const [movs, setMovs] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [lojaFilter, setLojaFilter] = useState("todas");

  useEffect(() => {
    Promise.all([
      base44.entities.MovimentacaoEstoque.list("-created_date", 1000),
      base44.entities.Loja.list(),
    ]).then(([m, l]) => { setMovs(m); setLojas(l); setLoading(false); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => movs.filter((m) => {
    if (tipoFilter !== "todos" && m.tipo !== tipoFilter) return false;
    if (lojaFilter !== "todas" && m.loja_id !== lojaFilter) return false;
    if (search && !`${m.item_nome || ""} ${m.motivo || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [movs, search, tipoFilter, lojaFilter]);

  return (
    <PageShell title="Histórico de Movimentações" description="Toda movimentação de estoque registrada no sistema. Auditável.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar item ou motivo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
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
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma movimentação.</TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell>{m.data ? format(new Date(m.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell><span className="text-xs">{TIPO_LABEL[m.tipo] || m.tipo}</span></TableCell>
                  <TableCell className="font-medium">{m.item_nome || "—"}</TableCell>
                  <TableCell>{lojaNome(m.loja_id)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(m.quantidade).toFixed(3)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.motivo || "—"}</TableCell>
                  <TableCell><span className="text-xs uppercase tracking-wide text-muted-foreground">{m.origem_tipo || "—"}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.usuario_email || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground mt-3">{filtered.length} movimentação(ões)</div>
    </PageShell>
  );
}