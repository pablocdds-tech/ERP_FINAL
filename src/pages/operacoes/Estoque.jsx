import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Boxes } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import { calcularSaldos } from "@/lib/operacoes-service";

export default function Estoque() {
  const [movs, setMovs] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");

  useEffect(() => {
    (async () => {
      const [m, l] = await Promise.all([
        base44.entities.MovimentacaoEstoque.list("-created_date", 5000),
        base44.entities.Loja.list(),
      ]);
      setMovs(m || []);
      setLojas(l || []);
      setLoading(false);
    })();
  }, []);

  const saldos = useMemo(() => Array.from(calcularSaldos(movs).values()), [movs]);
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => saldos.filter((s) => {
    if (tipoFilter !== "todos" && s.item_tipo !== tipoFilter) return false;
    if (lojaFilter !== "todas" && s.loja_id !== lojaFilter) return false;
    if (search && !(s.item_nome || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.item_nome || "").localeCompare(b.item_nome || "")), [saldos, search, lojaFilter, tipoFilter]);

  return (
    <PageShell title="Estoque" description="Saldos atuais por loja/CD, calculados a partir das movimentações.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Insumos e Produtos</SelectItem>
              <SelectItem value="insumo">Apenas insumos</SelectItem>
              <SelectItem value="produto">Apenas produtos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  <Boxes className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Nenhum saldo registrado ainda. Lance uma compra para começar.
                </TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={`${s.item_id}__${s.loja_id}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{s.item_nome}</TableCell>
                  <TableCell><span className="text-xs uppercase tracking-wide text-muted-foreground">{s.item_tipo}</span></TableCell>
                  <TableCell>{lojaNome(s.loja_id)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(s.saldo).toFixed(3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground mt-3">{filtered.length} linha(s)</div>
    </PageShell>
  );
}