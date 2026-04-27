import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Camera, Check, X, Clock } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { format } from "date-fns";

const TIPO = {
  folga: "Folga", troca_turno: "Troca de turno",
  justificativa_atraso: "Justificar atraso", justificativa_falta: "Justificar falta",
  atestado: "Atestado", outro: "Outro",
};
const STATUS_ICON = { pendente: Clock, aprovada: Check, rejeitada: X, cancelada: X };
const STATUS_CLS = {
  pendente: "text-amber-600", aprovada: "text-emerald-700",
  rejeitada: "text-destructive", cancelada: "text-slate-500",
};

export default function PwaSolicitacoes() {
  const { colaborador } = usePwa() || {};
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ tipo: "folga" });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!colaborador?.id) return;
    const list = await base44.entities.SolicitacaoRH.filter({ colaborador_id: colaborador.id }, "-created_date", 100);
    setItems(list);
  };
  useEffect(() => { load(); }, [colaborador?.id]); // eslint-disable-line

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setData((d) => ({ ...d, anexo_url: file_url }));
    setUploading(false);
  };

  const enviar = async () => {
    if (!colaborador?.id || !data.tipo) return;
    await base44.entities.SolicitacaoRH.create({
      colaborador_id: colaborador.id,
      loja_id: colaborador.loja_id,
      tipo: data.tipo,
      data_solicitacao: new Date().toISOString().slice(0, 10),
      data_referencia: data.data_referencia,
      descricao: data.descricao,
      anexo_url: data.anexo_url,
      status: "pendente",
    });
    setOpen(false); setData({ tipo: "folga" }); load();
  };

  if (!colaborador) {
    return (<div><PageTitle title="Solicitações" /><Card className="p-5 text-sm text-muted-foreground">Sem vínculo de colaborador.</Card></div>);
  }

  return (
    <div>
      <PageTitle title="Minhas solicitações" subtitle="Folgas, atestados, justificativas"
        action={<Button size="sm" onClick={() => { setData({ tipo: "folga" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Nova</Button>} />
      {items.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Nenhuma solicitação.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((s) => {
            const Icon = STATUS_ICON[s.status] || Clock;
            return (
              <Card key={s.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{TIPO[s.tipo] || s.tipo}</div>
                    {s.data_referencia && <div className="text-xs text-muted-foreground">Para {format(new Date(s.data_referencia), "dd/MM/yyyy")}</div>}
                    {s.descricao && <div className="text-xs mt-1 line-clamp-2">{s.descricao}</div>}
                    {s.resposta_gestor && <div className="text-[11px] mt-2 bg-muted rounded p-2">Gestor: {s.resposta_gestor}</div>}
                  </div>
                  <Icon className={`w-4 h-4 ${STATUS_CLS[s.status]} shrink-0`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova solicitação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" placeholder="Data de referência" value={data.data_referencia || ""} onChange={(e) => setData({ ...data, data_referencia: e.target.value })} />
            <Textarea rows={3} placeholder="Descreva sua solicitação..." value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
            {(data.tipo === "atestado" || data.tipo === "justificativa_atraso" || data.tipo === "justificativa_falta") && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Anexo (foto ou PDF)</label>
                <div className="flex gap-2">
                  <Input type="file" accept="image/*,application/pdf" capture="environment" onChange={onFile} disabled={uploading} />
                </div>
                {uploading && <div className="text-xs text-muted-foreground mt-1">Enviando...</div>}
                {data.anexo_url && <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Anexo enviado</div>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={enviar} disabled={uploading || !data.tipo}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}