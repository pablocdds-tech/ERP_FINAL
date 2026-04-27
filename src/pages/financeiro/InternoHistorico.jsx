import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import { format } from "date-fns";

const TIPO_LABEL = { debito: "Débito", credito: "Crédito", liquidacao: "Liquidação" };

export default function InternoHistorico() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [search, setSearch] = useState("");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.LancamentoInterno.list("-data", 5000),
      base44.entities.Loja.list(),
    ]).then(([l, lj]) => { setItems(l); setLojas(lj); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((l) => {
    if (lojaFilter !== "todas" && l.loja_origem_id !== lojaFilter && l.loja_destino_id !== lojaFilter) return false;
    if (dataDe && l.data < dataDe) return false;
    if (dataAte && l.data > dataAte) return false;
    if (search && !`${l.descricao || ""} ${l.cupom_numero || ""} ${l.categoria || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, lojaFilter, dataDe, dataAte]);

  const totalDebitos = filtered.filter((l) => l.tipo === "debito").reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const totalCreditos = filtered.filter((l) => l.tipo === "credito").reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const totalLiq = filtered.filter((l) => l.tipo === "liquidacao").reduce((s, l) => s + (Number(l.valor) || 0), 0);

  return (
    <PageShell title="Histórico Interno" description="Toda movimentação virtual entre as unidades, com filtros.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border text-sm">
          <Resumo label="Débitos" valor={totalDebitos} cor="text-amber-700" />
          <Resumo label="Créditos" valor={totalCreditos} cor="text-emerald-700" />
          <Resumo label="Liquidações" valor={totalLiq} cor="text-blue-700" />
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
                <TableHead>De</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem registros.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30">
                  <TableCell>{l.data ? format(new Date(l.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.cupom_numero || "—"}</TableCell>
                  <TableCell>{TIPO_LABEL[l.tipo] || l.tipo}</TableCell>
                  <TableCell>{lojaNome(l.loja_origem_id)}</TableCell>
                  <TableCell>{lojaNome(l.loja_destino_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.categoria || "—"}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(l.valor || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.usuario_email || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}

function Resumo({ label, valor, cor }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-medium ${cor}`}>R$ {valor.toFixed(2)}</div>
    </div>
  );
}