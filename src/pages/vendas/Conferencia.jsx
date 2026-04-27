import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/vendas/PageShell";
import { format } from "date-fns";

export default function Conferencia() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.FechamentoDiario.list("-data", 500),
      base44.entities.Loja.list(),
    ]).then(([f, l]) => { setItems(f); setLojas(l); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const linhas = useMemo(() => {
    const acc = new Map();
    for (const f of items) {
      if (lojaFilter !== "todas" && f.loja_id !== lojaFilter) continue;
      if (dataDe && f.data < dataDe) continue;
      if (dataAte && f.data > dataAte) continue;
      for (const p of f.vendas_por_pagamento || []) {
        const k = p.forma_id;
        const cur = acc.get(k) || { forma_nome: p.forma_nome, forma_tipo: p.forma_tipo, declarado: 0, conferido: 0 };
        cur.declarado += Number(p.valor_declarado) || 0;
        cur.conferido += Number(p.valor_conferido) || 0;
        acc.set(k, cur);
      }
    }
    return Array.from(acc.values()).map((r) => ({ ...r, dif: r.conferido - r.declarado }))
      .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif));
  }, [items, lojaFilter, dataDe, dataAte]);

  const totalDecl = linhas.reduce((s, l) => s + l.declarado, 0);
  const totalConf = linhas.reduce((s, l) => s + l.conferido, 0);
  const totalDif = totalConf - totalDecl;

  return (
    <PageShell
      title="Conferência por forma de pagamento"
      description="Compare valores declarados pelo operador com os conferidos pelo gestor."
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[180px]" placeholder="De" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[180px]" placeholder="Até" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Forma de pagamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Declarado</TableHead>
                <TableHead className="text-right">Conferido</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Sem dados no período.</TableCell></TableRow>
              ) : linhas.map((l, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{l.forma_nome}</TableCell>
                  <TableCell><span className="text-xs uppercase text-muted-foreground">{l.forma_tipo}</span></TableCell>
                  <TableCell className="text-right font-mono">R$ {l.declarado.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">R$ {l.conferido.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-mono flex items-center justify-end gap-1.5 ${Math.abs(l.dif) > 0.001 ? "text-amber-700" : "text-emerald-700"}`}>
                    {Math.abs(l.dif) > 0.001 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {l.dif >= 0 ? "+" : ""}R$ {l.dif.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {linhas.length > 0 && (
          <div className="bg-muted/30 px-4 py-3 border-t border-border flex justify-between items-center text-sm">
            <span className="font-medium">Total</span>
            <div className="flex gap-6 font-mono">
              <span>Decl. R$ {totalDecl.toFixed(2)}</span>
              <span>Conf. R$ {totalConf.toFixed(2)}</span>
              <span className={Math.abs(totalDif) > 0.001 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                Dif. {totalDif >= 0 ? "+" : ""}R$ {totalDif.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}