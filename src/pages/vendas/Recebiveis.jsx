import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Ban } from "lucide-react";
import PageShell from "@/components/vendas/PageShell";
import { format } from "date-fns";

const STATUS_MAP = {
  previsto: { label: "Previsto", className: "bg-blue-50 text-blue-700 border-blue-200" },
  recebido: { label: "Recebido", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelado: { label: "Cancelado", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function Recebiveis() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [statusFilter, setStatusFilter] = useState("previsto");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const load = async () => {
    const [r, l] = await Promise.all([
      base44.entities.Recebivel.list("data_prevista", 500),
      base44.entities.Loja.list(),
    ]);
    setItems(r); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((r) => {
    if (statusFilter !== "todos" && r.status !== statusFilter) return false;
    if (lojaFilter !== "todas" && r.loja_id !== lojaFilter) return false;
    if (dataDe && r.data_prevista < dataDe) return false;
    if (dataAte && r.data_prevista > dataAte) return false;
    return true;
  }), [items, statusFilter, lojaFilter, dataDe, dataAte]);

  const totalBruto = filtered.reduce((s, r) => s + (Number(r.valor_bruto) || 0), 0);
  const totalLiquido = filtered.reduce((s, r) => s + (Number(r.valor_liquido) || 0), 0);

  const marcarRecebido = async (r) => {
    await base44.entities.Recebivel.update(r.id, { status: "recebido" });
    load();
  };
  const cancelar = async (r) => {
    await base44.entities.Recebivel.update(r.id, { status: "cancelado" });
    load();
  };

  return (
    <PageShell title="Recebíveis previstos" description="Valores futuros de cartão, iFood e outros — gerados automaticamente ao conferir o caixa.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="previsto">Previstos</SelectItem>
              <SelectItem value="recebido">Recebidos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" placeholder="De" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" placeholder="Até" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Previsto p/</TableHead>
                <TableHead>Venda em</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">Nenhum recebível.</TableCell></TableRow>
              ) : filtered.map((r) => {
                const s = STATUS_MAP[r.status] || { label: r.status, className: "" };
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.data_prevista ? format(new Date(r.data_prevista), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.data_venda ? format(new Date(r.data_venda), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>{lojaNome(r.loja_id)}</TableCell>
                    <TableCell>{r.forma_nome}</TableCell>
                    <TableCell className="text-right font-mono">R$ {Number(r.valor_bruto || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{Number(r.taxa_percentual || 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono">R$ {Number(r.valor_liquido || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className={`font-normal ${s.className}`}>{s.label}</Badge></TableCell>
                    <TableCell>
                      {r.status === "previsto" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Marcar recebido" onClick={() => marcarRecebido(r)}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar" onClick={() => cancelar(r)}>
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="bg-muted/30 px-4 py-3 border-t flex justify-between text-sm">
            <span className="font-medium">Total ({filtered.length})</span>
            <div className="flex gap-6 font-mono">
              <span>Bruto R$ {totalBruto.toFixed(2)}</span>
              <span className="font-semibold">Líquido R$ {totalLiquido.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}