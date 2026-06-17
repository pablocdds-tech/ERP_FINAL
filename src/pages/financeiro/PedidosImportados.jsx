import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cardapioWebService } from "@/lib/cardapio-web-service";
import PageShell from "@/components/financeiro/PageShell";
import PedidoImportadoDialog from "@/components/integracoes/PedidoImportadoDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, RefreshCw } from "lucide-react";

import { fmtMoeda } from "@/lib/format";
const fmtData = (v) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export default function PedidosImportados() {
  const [rows, setRows] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ loja: "all", status: "all", pagamento: "all", cliente: "", numero: "", de: "", ate: "" });

  const load = async () => {
    setLoading(true);
    const [pedidos, lojasData, me] = await Promise.all([
      cardapioWebService.listPedidos(),
      base44.entities.Loja.list("nome", 500),
      base44.auth.me().catch(() => null),
    ]);
    setRows(pedidos || []);
    setLojas(lojasData || []);
    setIsAdmin(me?.role === "admin");
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";
  const pagamentos = useMemo(() => [...new Set(rows.map((r) => r.payment_method).filter(Boolean))], [rows]);

  const filtrados = useMemo(() => rows.filter((r) => {
    if (f.loja !== "all" && r.store_id !== f.loja) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.pagamento !== "all" && r.payment_method !== f.pagamento) return false;
    if (f.cliente && !String(r.customer_name || "").toLowerCase().includes(f.cliente.toLowerCase()) && !String(r.customer_phone || "").includes(f.cliente.replace(/\D/g, ""))) return false;
    if (f.numero && !String(r.order_number || "").includes(f.numero)) return false;
    const d = (r.ordered_at || r.created_date || "").slice(0, 10);
    if (f.de && d < f.de) return false;
    if (f.ate && d > f.ate) return false;
    return true;
  }), [rows, f]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status).filter(Boolean))], [rows]);

  return (
    <PageShell
      title="Pedidos Importados"
      description="Pedidos recebidos do Cardápio Web via webhook ou sincronização."
      actions={<Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        <Select value={f.loja} onValueChange={(v) => setF({ ...f, loja: v })}><SelectTrigger><SelectValue placeholder="Loja" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as lojas</SelectItem>{lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select>
        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos status</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={f.pagamento} onValueChange={(v) => setF({ ...f, pagamento: v })}><SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger><SelectContent><SelectItem value="all">Todos pagamentos</SelectItem>{pagamentos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Cliente / telefone" value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} />
        <Input placeholder="Nº pedido" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} />
        <Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} />
        <Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data/hora</TableHead><TableHead>Loja</TableHead><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead>Pagamento</TableHead><TableHead>Total</TableHead><TableHead>Canal</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10}>Carregando...</TableCell></TableRow> : filtrados.length === 0 ? <TableRow><TableCell colSpan={10} className="text-muted-foreground">Nenhum pedido importado.</TableCell></TableRow> : filtrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmtData(r.ordered_at || r.created_date)}</TableCell>
                <TableCell>{lojaNome(r.store_id)}</TableCell>
                <TableCell className="font-mono">{r.order_number}</TableCell>
                <TableCell>{r.customer_name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.customer_phone || "—"}</TableCell>
                <TableCell><Badge variant="secondary">{r.status || "—"}</Badge></TableCell>
                <TableCell>{r.payment_method || "—"}</TableCell>
                <TableCell>{fmtMoeda(r.total_amount)}</TableCell>
                <TableCell><span className="text-xs">{r.sales_channel || "Cardápio Web"}</span></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setSel(r); setOpen(true); }}><Eye className="w-4 h-4" /> Detalhes</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PedidoImportadoDialog pedido={sel} isAdmin={isAdmin} open={open} onOpenChange={setOpen} />
    </PageShell>
  );
}