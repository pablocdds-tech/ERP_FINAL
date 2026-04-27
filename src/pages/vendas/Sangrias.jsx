import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageShell from "@/components/vendas/PageShell";
import { format } from "date-fns";

export default function Sangrias() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.FechamentoDiario.list("-data", 500),
      base44.entities.Loja.list(),
    ]).then(([f, l]) => { setItems(f); setLojas(l); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const sangrias = useMemo(() => {
    const out = [];
    for (const f of items) {
      if (lojaFilter !== "todas" && f.loja_id !== lojaFilter) continue;
      for (const s of f.sangrias || []) {
        out.push({ ...s, loja_id: f.loja_id, data: f.data, fechamento_id: f.id });
      }
    }
    return out.filter((s) => !search || `${s.motivo || ""} ${s.responsavel || ""}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [items, lojaFilter, search]);

  const despesas = useMemo(() => {
    const out = [];
    for (const f of items) {
      if (lojaFilter !== "todas" && f.loja_id !== lojaFilter) continue;
      for (const d of f.despesas_caixa || []) {
        out.push({ ...d, loja_id: f.loja_id, data: f.data, fechamento_id: f.id });
      }
    }
    return out.filter((d) => !search || `${d.descricao || ""} ${d.categoria_nome || ""} ${d.fornecedor || ""}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [items, lojaFilter, search]);

  const totalSang = sangrias.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const totalDesp = despesas.reduce((s, x) => s + (Number(x.valor) || 0), 0);

  return (
    <PageShell title="Sangrias e despesas" description="Histórico de retiradas de dinheiro e despesas pagas no caixa.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="sangrias">
        <TabsList>
          <TabsTrigger value="sangrias">Sangrias ({sangrias.length})</TabsTrigger>
          <TabsTrigger value="despesas">Despesas ({despesas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sangrias" className="mt-3">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sangrias.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem sangrias.</TableCell></TableRow>
                  ) : sangrias.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>{s.data ? format(new Date(s.data), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{lojaNome(s.loja_id)}</TableCell>
                      <TableCell className="font-medium">{s.motivo || "—"}</TableCell>
                      <TableCell>{s.responsavel || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.horario || "—"}</TableCell>
                      <TableCell className="text-right font-mono">R$ {Number(s.valor || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sangrias.length > 0 && (
              <div className="bg-muted/30 px-4 py-3 border-t flex justify-between text-sm">
                <span className="font-medium">Total</span>
                <span className="font-mono font-semibold">R$ {totalSang.toFixed(2)}</span>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="mt-3">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem despesas.</TableCell></TableRow>
                  ) : despesas.map((d, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell>{d.data ? format(new Date(d.data), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{lojaNome(d.loja_id)}</TableCell>
                      <TableCell>{d.categoria_nome || "—"}</TableCell>
                      <TableCell className="font-medium">{d.descricao || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.fornecedor || "—"}</TableCell>
                      <TableCell className="text-right font-mono">R$ {Number(d.valor || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {despesas.length > 0 && (
              <div className="bg-muted/30 px-4 py-3 border-t flex justify-between text-sm">
                <span className="font-medium">Total</span>
                <span className="font-mono font-semibold">R$ {totalDesp.toFixed(2)}</span>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}