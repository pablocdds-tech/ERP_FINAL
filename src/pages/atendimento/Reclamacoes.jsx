import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import StatusBadge from "@/components/atendimento/StatusBadge";
import ReclamacaoDialog from "@/components/atendimento/ReclamacaoDialog";
import { motivoLabel, MOTIVOS_RECLAMACAO, STATUS_TRATATIVA } from "@/lib/atendimento-config";

export default function Reclamacoes() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fMotivo, setFMotivo] = useState("todos");
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [r, l, c] = await Promise.all([
      base44.entities.Reclamacao.list("-data"),
      base44.entities.Loja.list(),
      base44.entities.Cliente.list(),
    ]);
    setItems(r); setLojas(l); setClientes(c);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtrados = items.filter((r) => {
    if (fStatus !== "todos" && r.status_tratativa !== fStatus) return false;
    if (fMotivo !== "todos" && r.motivo !== fMotivo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (r.titulo?.toLowerCase().includes(q) || r.cliente_nome?.toLowerCase().includes(q) || r.pedido_referencia?.includes(busca));
    }
    return true;
  });

  return (
    <PageShell title="Reclamações" description="Registro completo de reclamações com motivo, responsável e tratativa."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Nova reclamação</Button>}>
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar título, cliente, pedido..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_TRATATIVA.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fMotivo} onValueChange={setFMotivo}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os motivos</SelectItem>
            {MOTIVOS_RECLAMACAO.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma reclamação encontrada.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Sev.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.data && format(new Date(r.data), "dd/MM/yy")}</TableCell>
                  <TableCell className="font-medium max-w-[260px] truncate">{r.titulo}</TableCell>
                  <TableCell className="text-xs">{r.cliente_nome || clientes.find((c) => c.id === r.cliente_id)?.nome || "—"}</TableCell>
                  <TableCell className="text-xs">{lojaNome(r.loja_id)}</TableCell>
                  <TableCell className="text-xs">{motivoLabel(r.motivo)}</TableCell>
                  <TableCell>
                    {r.severidade === "critica" || r.severidade === "alta" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" /> {r.severidade}</span>
                    ) : <span className="text-xs text-muted-foreground">{r.severidade}</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status_tratativa} /></TableCell>
                  <TableCell className="text-xs">{r.responsavel_tratativa || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDlg({ open: true, item: r })}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReclamacaoDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })}
        item={dlg.item} onSaved={load} clientes={clientes} />
    </PageShell>
  );
}