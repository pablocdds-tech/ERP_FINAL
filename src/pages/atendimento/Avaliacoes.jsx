import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Star } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import AvaliacaoDialog from "@/components/atendimento/AvaliacaoDialog";

export default function Avaliacoes() {
  const [items, setItems] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => setItems(await base44.entities.Avaliacao.list("-data"));
  useEffect(() => { load(); }, []);

  const stars = (n) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= (n || 0) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
      ))}
    </div>
  );

  return (
    <PageShell title="Avaliações" description="Notas e comentários recebidos por canal."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Nova avaliação</Button>}>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma avaliação registrada.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.nota ? stars(a.nota) : null}
                    {typeof a.nps_score === "number" && (
                      <Badge variant="outline" className="text-xs">NPS: {a.nps_score}/10</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{a.canal_origem}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {a.cliente_nome || "Anônimo"} • {a.data && format(new Date(a.data), "dd/MM/yy")}
                  </div>
                  {a.comentario && <div className="text-sm mt-2">{a.comentario}</div>}
                  {a.resposta && (
                    <div className="text-xs mt-2 p-2 bg-muted rounded">
                      <span className="font-medium">Resposta: </span>{a.resposta}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDlg({ open: true, item: a })}>
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AvaliacaoDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })} item={dlg.item} onSaved={load} />
    </PageShell>
  );
}