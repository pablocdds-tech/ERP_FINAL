import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Camera, X, MessageSquare } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { format } from "date-fns";
import ComentariosTimeline from "@/components/rotinas/ComentariosTimeline";

const STATUS_CLS = {
  aberto: "bg-amber-50 text-amber-700 border-amber-200",
  em_atendimento: "bg-blue-50 text-blue-700 border-blue-200",
  resolvido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PwaChamados() {
  const { colaborador, gestor } = usePwa() || {};
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ categoria: "manutencao", prioridade: "media", fotos: [] });
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState({ open: false, ch: null });

  const load = async () => {
    let list;
    if (gestor) list = await base44.entities.Chamado.list("-created_date", 100);
    else if (colaborador?.id) list = await base44.entities.Chamado.filter({ colaborador_id: colaborador.id }, "-created_date", 100);
    else list = [];
    setItems(list);
  };
  useEffect(() => { load(); }, [colaborador?.id, gestor]); // eslint-disable-line

  const tirarFoto = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setData((d) => ({ ...d, fotos: [...(d.fotos || []), file_url] }));
      setUploading(false);
    };
    input.click();
  };

  const removerFoto = (idx) => setData({ ...data, fotos: data.fotos.filter((_, i) => i !== idx) });

  const enviar = async () => {
    if (!data.titulo) return;
    await base44.entities.Chamado.create({
      ...data,
      colaborador_id: colaborador?.id,
      loja_id: colaborador?.loja_id,
      status: "aberto",
    });
    setOpen(false);
    setData({ categoria: "manutencao", prioridade: "media", fotos: [] });
    load();
  };

  return (
    <div>
      <PageTitle title="Chamados" subtitle={gestor ? "Visão do gestor" : "Seus chamados"}
        action={!gestor && <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Novo</Button>} />
      {items.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Nenhum chamado.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="p-3 cursor-pointer" onClick={() => setView({ open: true, ch: c })}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">{c.titulo}<MessageSquare className="w-3 h-3 text-muted-foreground" /></div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(c.created_date), "dd/MM HH:mm")} • {c.categoria} • {c.prioridade}
                  </div>
                  {c.descricao && <div className="text-xs mt-1 line-clamp-2">{c.descricao}</div>}
                  {(c.fotos || []).length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {c.fotos.slice(0, 3).map((f, i) => (
                        <img key={i} src={f} alt="" className="w-12 h-12 object-cover rounded border border-border" />
                      ))}
                    </div>
                  )}
                  {c.resposta && <div className="text-[11px] mt-2 bg-muted rounded p-2">Resposta: {c.resposta}</div>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_CLS[c.status]} shrink-0`}>{c.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={view.open} onOpenChange={(o) => !o && setView({ open: false, ch: null })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{view.ch?.titulo}</DialogTitle></DialogHeader>
          {view.ch && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">{view.ch.categoria} • {view.ch.prioridade} • {view.ch.status}</div>
              {view.ch.descricao && <div className="text-sm">{view.ch.descricao}</div>}
              {(view.ch.fotos || []).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {view.ch.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noreferrer">
                      <img src={f} alt="" className="w-full h-20 object-cover rounded border border-border" />
                    </a>
                  ))}
                </div>
              )}
              <ComentariosTimeline entidade="Chamado" entidade_id={view.ch.id} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setView({ open: false, ch: null })}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo chamado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={data.titulo || ""} onChange={(e) => setData({ ...data, titulo: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={data.categoria} onValueChange={(v) => setData({ ...data, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="ti">TI</SelectItem>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={data.prioridade} onValueChange={(v) => setData({ ...data, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={3} placeholder="Descreva o problema..." value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
            <div>
              <Button type="button" variant="outline" size="sm" onClick={tirarFoto} disabled={uploading} className="w-full">
                <Camera className="w-4 h-4 mr-1.5" /> {uploading ? "Enviando..." : "Adicionar foto"}
              </Button>
              {(data.fotos || []).length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {data.fotos.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={f} alt="" className="w-full h-20 object-cover rounded border border-border" />
                      <button onClick={() => removerFoto(i)} className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={enviar} disabled={!data.titulo || uploading}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}