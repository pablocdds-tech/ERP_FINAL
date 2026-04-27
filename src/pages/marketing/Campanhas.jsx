import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Megaphone } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/marketing/PageShell";
import CampanhaDialog from "@/components/marketing/CampanhaDialog";

const STATUS_COLORS = {
  rascunho: "bg-muted text-muted-foreground",
  agendada: "bg-blue-100 text-blue-700",
  ativa: "bg-emerald-100 text-emerald-700",
  encerrada: "bg-slate-100 text-slate-700",
  cancelada: "bg-red-100 text-red-700",
};

export default function Campanhas() {
  const [items, setItems] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [c, p] = await Promise.all([
      base44.entities.Campanha.list("-data_inicio"),
      base44.entities.PedidoCliente.list(),
    ]);
    setItems(c); setPedidos(p);
  };
  useEffect(() => { load(); }, []);

  const metricas = (id) => {
    const ps = pedidos.filter((p) => p.campanha_id === id);
    const receita = ps.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
    return { pedidos: ps.length, receita };
  };

  return (
    <PageShell title="Campanhas" description="Crie campanhas com vigência, meta e público-alvo."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Nova campanha</Button>}>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha cadastrada.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c) => {
            const m = metricas(c.id);
            const meta = Number(c.meta_receita) || 0;
            const pct = meta > 0 ? Math.min(100, (m.receita / meta) * 100) : 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Megaphone className="w-4 h-4 text-primary shrink-0" />
                    <div className="font-medium text-sm truncate">{c.nome}</div>
                  </div>
                  <Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.data_inicio && format(new Date(c.data_inicio), "dd/MM/yy")}
                  {c.data_fim ? ` → ${format(new Date(c.data_fim), "dd/MM/yy")}` : ""}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Pedidos:</span> <b>{m.pedidos}</b></div>
                  <div><span className="text-muted-foreground">Receita:</span> <b>R$ {m.receita.toFixed(2)}</b></div>
                </div>
                {meta > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% da meta de R$ {meta.toFixed(2)}</div>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, item: c })}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <CampanhaDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })} item={dlg.item} onSaved={load} />
    </PageShell>
  );
}