import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import CortesiaDialog from "@/components/atendimento/CortesiaDialog";

export default function Cortesias() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [c, l] = await Promise.all([
      base44.entities.Cortesia.list("-data"),
      base44.entities.Loja.list(),
    ]);
    setItems(c); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const total = items.reduce((s, c) => s + (Number(c.valor_estimado) || 0), 0);
  const pendentes = items.filter((c) => c.alerta_financeiro && !c.lancamento_financeiro_id).length;

  return (
    <PageShell title="Cortesias" description="Brindes, vouchers e cortesias concedidas. Custo monitorado pelo financeiro."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Nova cortesia</Button>}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total concedido</div><div className="text-2xl font-semibold mt-1">R$ {total.toFixed(2)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Quantidade</div><div className="text-2xl font-semibold mt-1">{items.length}</div></Card>
        <Card className={`p-4 ${pendentes > 0 ? "border-amber-300" : ""}`}>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {pendentes > 0 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            Alertas financeiros pendentes
          </div>
          <div className="text-2xl font-semibold mt-1">{pendentes}</div>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma cortesia registrada.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Autorizado por</TableHead>
                <TableHead>Financeiro</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{c.data && format(new Date(c.data), "dd/MM/yy")}</TableCell>
                  <TableCell>{c.cliente_nome || "—"}</TableCell>
                  <TableCell className="text-xs">{lojas.find((l) => l.id === c.loja_id)?.nome || "—"}</TableCell>
                  <TableCell className="text-xs">{c.tipo}</TableCell>
                  <TableCell>R$ {(c.valor_estimado || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{c.autorizado_por || "—"}</TableCell>
                  <TableCell>
                    {c.lancamento_financeiro_id ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Lançado</Badge>
                    ) : c.alerta_financeiro ? (
                      <Badge className="bg-amber-100 text-amber-700">Alerta</Badge>
                    ) : (
                      <Badge variant="outline">—</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDlg({ open: true, item: c })}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CortesiaDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })} item={dlg.item} onSaved={load} />
    </PageShell>
  );
}