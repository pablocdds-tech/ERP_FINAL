import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import { format } from "date-fns";

const round = (n) => Number(Number(n || 0).toFixed(2));

export default function FluxoCaixa() {
  const [movs, setMovs] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [lojaFilter, setLojaFilter] = useState("todas");
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataDe, setDataDe] = useState(hojeISO.slice(0, 8) + "01");
  const [dataAte, setDataAte] = useState(hojeISO);

  useEffect(() => {
    Promise.all([
      base44.entities.MovimentacaoBancaria.list("-data", 5000),
      base44.entities.ContaPagar.list("data_vencimento", 1000),
      base44.entities.ContaReceber.list("data_vencimento", 1000),
      base44.entities.Loja.list(),
    ]).then(([m, p, r, l]) => { setMovs(m); setContasPagar(p); setContasReceber(r); setLojas(l); });
  }, []);

  // Realizado: agrega movimentações bancárias por dia (entrada/saída)
  const realizado = useMemo(() => {
    const map = new Map();
    for (const m of movs) {
      if (!m.data || m.data < dataDe || m.data > dataAte) continue;
      if (lojaFilter !== "todas" && m.loja_id !== lojaFilter) continue;
      // Saldo inicial é fotografia da conta, não movimento de caixa — ignora.
      if (m.tipo === "saldo_inicial" || m.origem_tipo === "saldo_inicial") continue;
      const cur = map.get(m.data) || { data: m.data, entradas: 0, saidas: 0 };
      const positivo = ["credito", "transferencia_entrada"].includes(m.tipo);
      const v = Number(m.valor) || 0;
      if (positivo) cur.entradas += v; else cur.saidas += v;
      map.set(m.data, cur);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, saldo: round(r.entradas - r.saidas) }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [movs, dataDe, dataAte, lojaFilter]);

  const totRealEnt = realizado.reduce((s, r) => s + r.entradas, 0);
  const totRealSai = realizado.reduce((s, r) => s + r.saidas, 0);

  // Previsto: contas a pagar/receber em aberto no período
  const previsto = useMemo(() => {
    const map = new Map();
    const add = (data, key, valor) => {
      if (!data || data < dataDe || data > dataAte) return;
      const cur = map.get(data) || { data, entradas: 0, saidas: 0 };
      cur[key] = round(cur[key] + valor);
      map.set(data, cur);
    };
    for (const c of contasPagar) {
      if (c.status === "paga" || c.status === "cancelada") continue;
      if (lojaFilter !== "todas" && c.loja_id !== lojaFilter) continue;
      const restante = (Number(c.valor) || 0) - (Number(c.valor_pago) || 0);
      if (restante > 0) add(c.data_vencimento, "saidas", restante);
    }
    for (const c of contasReceber) {
      if (c.status === "recebida" || c.status === "cancelada") continue;
      if (lojaFilter !== "todas" && c.loja_id !== lojaFilter) continue;
      const restante = (Number(c.valor) || 0) - (Number(c.valor_recebido) || 0);
      if (restante > 0) add(c.data_vencimento, "entradas", restante);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, saldo: round(r.entradas - r.saidas) }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [contasPagar, contasReceber, dataDe, dataAte, lojaFilter]);

  const totPrevEnt = previsto.reduce((s, r) => s + r.entradas, 0);
  const totPrevSai = previsto.reduce((s, r) => s + r.saidas, 0);

  return (
    <PageShell title="Fluxo de Caixa" description="Realizado (banco) e previsto (contas em aberto).">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
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
      </Card>

      <Tabs defaultValue="realizado">
        <TabsList>
          <TabsTrigger value="realizado"><TrendingUp className="w-4 h-4 mr-1.5" />Realizado</TabsTrigger>
          <TabsTrigger value="previsto"><TrendingDown className="w-4 h-4 mr-1.5" />Previsto</TabsTrigger>
        </TabsList>

        <TabsContent value="realizado" className="mt-3">
          <FluxoTabela linhas={realizado} totEnt={totRealEnt} totSai={totRealSai} />
        </TabsContent>
        <TabsContent value="previsto" className="mt-3">
          <FluxoTabela linhas={previsto} totEnt={totPrevEnt} totSai={totPrevSai} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function FluxoTabela({ linhas, totEnt, totSai }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo do dia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">Nada no período.</TableCell></TableRow>
            ) : linhas.map((r) => (
              <TableRow key={r.data} className="hover:bg-muted/30">
                <TableCell>{format(new Date(r.data), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-right font-mono text-emerald-700">R$ {r.entradas.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-destructive">R$ {r.saidas.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-mono font-medium ${r.saldo < 0 ? "text-destructive" : ""}`}>R$ {r.saldo.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {linhas.length > 0 && (
        <div className="bg-muted/30 px-4 py-3 border-t flex justify-between text-sm font-mono">
          <span className="font-medium font-sans">Total</span>
          <div className="flex gap-6">
            <span className="text-emerald-700">+R$ {totEnt.toFixed(2)}</span>
            <span className="text-destructive">−R$ {totSai.toFixed(2)}</span>
            <span className={`font-semibold ${(totEnt - totSai) < 0 ? "text-destructive" : ""}`}>
              R$ {(totEnt - totSai).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}