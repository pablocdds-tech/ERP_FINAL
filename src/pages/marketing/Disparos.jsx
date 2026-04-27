import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Send, Calendar } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/marketing/PageShell";
import DisparoDialog from "@/components/marketing/DisparoDialog";

const STATUS_COLORS = {
  rascunho: "bg-muted text-muted-foreground",
  agendado: "bg-blue-100 text-blue-700",
  enviando: "bg-amber-100 text-amber-700",
  enviado: "bg-emerald-100 text-emerald-700",
  falhou: "bg-red-100 text-red-700",
  cancelado: "bg-slate-100 text-slate-700",
};

export default function Disparos() {
  const [items, setItems] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [d, c] = await Promise.all([
      base44.entities.DisparoMarketing.list("-created_date"),
      base44.entities.Campanha.list(),
    ]);
    setItems(d); setCampanhas(c);
  };
  useEffect(() => { load(); }, []);

  return (
    <PageShell title="Disparos WhatsApp" description="Mensagens em massa via WhatsApp, SMS, email ou n8n. Os disparos rodarão por integração futura."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Novo disparo</Button>}>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum disparo criado.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <div className="font-medium">{d.titulo}</div>
                    <Badge className={STATUS_COLORS[d.status] || ""}>{d.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Canal: {d.canal} • Público: {d.publico_alvo}
                    {d.agendado_para && (
                      <span className="ml-2 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(d.agendado_para), "dd/MM/yy HH:mm")}</span>
                    )}
                  </div>
                  {d.mensagem && <div className="text-sm mt-2 line-clamp-2 text-muted-foreground">{d.mensagem}</div>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setDlg({ open: true, item: d })}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <DisparoDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })}
        item={dlg.item} onSaved={load} campanhas={campanhas} />
    </PageShell>
  );
}