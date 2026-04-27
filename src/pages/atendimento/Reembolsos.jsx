import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import ReembolsoDialog from "@/components/atendimento/ReembolsoDialog";

const STATUS_CORES = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-blue-100 text-blue-700",
  executado: "bg-emerald-100 text-emerald-700",
  negado: "bg-red-100 text-red-700",
  cancelado: "bg-muted text-muted-foreground",
};

export default function Reembolsos() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [r, l, f] = await Promise.all([
      base44.entities.Reembolso.list("-data"),
      base44.entities.Loja.list(),
      base44.entities.FormaPagamento.list(),
    ]);
    setItems(r); setLojas(l); setFormas(f);
  };
  useEffect(() => { load(); }, []);

  const totalPendente = items.filter((r) => r.status === "pendente" || r.status === "aprovado").reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const totalExecutado = items.filter((r) => r.status === "executado").reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const alertas = items.filter((r) => r.alerta_financeiro && !r.lancamento_financeiro_id && r.status !== "cancelado" && r.status !== "negado").length;

  return (
    <PageShell title="Reembolsos" description="Devoluções de valores aos clientes. Status acompanhado pelo financeiro."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Novo reembolso</Button>}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">A executar</div><div className="text-2xl font-semibold mt-1">R$ {totalPendente.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Já executado</div><div className="text-2xl font-semibold mt-1">R$ {totalExecutado.toFixed(2)}</div></Card>
        <Card className={`p-4 ${alertas > 0 ? "border-amber-300" : ""}`}>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {alertas > 0 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            Alertas financeiros
          </div>
          <div className="text-2xl font-semibold mt-1">{alertas}</div>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum reembolso registrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.data && format(new Date(r.data), "dd/MM/yy")}</TableCell>
                  <TableCell>{r.cliente_nome || "—"}</TableCell>
                  <TableCell className="text-xs">{lojas.find((l) => l.id === r.loja_id)?.nome || "—"}</TableCell>
                  <TableCell className="text-xs">{r.pedido_referencia || "—"}</TableCell>
                  <TableCell className="font-medium">R$ {(r.valor || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{formas.find((f) => f.id === r.forma_pagamento_id)?.nome || "—"}</TableCell>
                  <TableCell><Badge className={STATUS_CORES[r.status] || ""}>{r.status}</Badge></TableCell>
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

      <ReembolsoDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })}
        item={dlg.item} onSaved={load} formasPagamento={formas} />
    </PageShell>
  );
}