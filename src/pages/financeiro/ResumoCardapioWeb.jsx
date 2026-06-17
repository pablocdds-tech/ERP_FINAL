import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cardapioWebService } from "@/lib/cardapio-web-service";
import PageShell from "@/components/financeiro/PageShell";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { fmtMoeda } from "@/lib/format";
const n = (v) => Number(v || 0);

// Classifica a forma de pagamento bruta em buckets padrão.
function bucket(metodo) {
  const m = String(metodo || "").toLowerCase();
  if (/dinheiro|cash|especie|espécie/.test(m)) return "Dinheiro";
  if (/pix/.test(m)) return "Pix";
  if (/cr[eé]dito|credit/.test(m)) return "Crédito";
  if (/d[eé]bito|debit/.test(m)) return "Débito";
  if (/online|app|site|web/.test(m)) return "Pago online";
  return "Outros";
}
const BUCKETS = ["Dinheiro", "Pix", "Crédito", "Débito", "Pago online", "Outros"];

export default function ResumoCardapioWeb() {
  const [rows, setRows] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ loja: "all", de: "", ate: "" });

  const load = async () => {
    setLoading(true);
    const [pedidos, lojasData] = await Promise.all([
      cardapioWebService.listPedidos(),
      base44.entities.Loja.list("nome", 500),
    ]);
    setRows(pedidos || []);
    setLojas(lojasData || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtrados = useMemo(() => rows.filter((r) => {
    if (f.loja !== "all" && r.store_id !== f.loja) return false;
    const d = (r.ordered_at || r.created_date || "").slice(0, 10);
    if (f.de && d < f.de) return false;
    if (f.ate && d > f.ate) return false;
    return true;
  }), [rows, f]);

  // Agrupa por loja + data
  const grupos = useMemo(() => {
    const map = {};
    for (const r of filtrados) {
      const data = (r.ordered_at || r.created_date || "").slice(0, 10);
      const key = `${r.store_id}|${data}`;
      if (!map[key]) {
        map[key] = { store_id: r.store_id, data, qtd: 0, bruto: 0, desconto: 0, entrega: 0, total: 0, porPagamento: Object.fromEntries(BUCKETS.map((b) => [b, 0])) };
      }
      const g = map[key];
      g.qtd += 1;
      g.bruto += n(r.subtotal);
      g.desconto += n(r.discount);
      g.entrega += n(r.delivery_fee);
      g.total += n(r.total_amount);
      g.porPagamento[bucket(r.payment_method)] += n(r.total_amount);
    }
    return Object.values(map).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [filtrados]);

  return (
    <PageShell
      title="Resumo de Fechamento — Cardápio Web"
      description="Pedidos importados agrupados por loja e data, por forma de pagamento."
      actions={<Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Select value={f.loja} onValueChange={(v) => setF({ ...f, loja: v })}><SelectTrigger><SelectValue placeholder="Loja" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as lojas</SelectItem>{lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} />
        <Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Loja</TableHead><TableHead>Pedidos</TableHead><TableHead>Bruto</TableHead><TableHead>Descontos</TableHead><TableHead>Entrega</TableHead><TableHead>Total</TableHead>{BUCKETS.map((b) => <TableHead key={b}>{b}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={13}>Carregando...</TableCell></TableRow> : grupos.length === 0 ? <TableRow><TableCell colSpan={13} className="text-muted-foreground">Nenhum pedido no período.</TableCell></TableRow> : grupos.map((g) => (
              <TableRow key={`${g.store_id}|${g.data}`}>
                <TableCell>{g.data ? new Date(g.data).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell>{lojaNome(g.store_id)}</TableCell>
                <TableCell>{g.qtd}</TableCell>
                <TableCell>{fmtMoeda(g.bruto)}</TableCell>
                <TableCell>{fmtMoeda(g.desconto)}</TableCell>
                <TableCell>{fmtMoeda(g.entrega)}</TableCell>
                <TableCell className="font-medium">{fmtMoeda(g.total)}</TableCell>
                {BUCKETS.map((b) => <TableCell key={b}>{fmtMoeda(g.porPagamento[b])}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}