import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Clock as ClockIcon } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { format } from "date-fns";

const PRI_CLS = { baixa: "text-slate-500", media: "text-amber-700", alta: "text-destructive" };

export default function PwaTarefas() {
  const { colaborador, gestor, user } = usePwa() || {};
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({});

  const load = async () => {
    let list;
    if (gestor) {
      list = await base44.entities.Tarefa.list("-created_date", 200);
      const cs = await base44.entities.Colaborador.filter({ status: "ativo" });
      setColaboradores(cs);
    } else if (colaborador?.id) {
      list = await base44.entities.Tarefa.filter({ responsavel_id: colaborador.id }, "-created_date", 200);
    } else list = [];
    setItems(list);
  };
  useEffect(() => { load(); }, [colaborador?.id, gestor]); // eslint-disable-line

  const concluir = async (t) => {
    await base44.entities.Tarefa.update(t.id, { status: "concluida", concluida_em: new Date().toISOString() });
    load();
  };

  const criar = async () => {
    if (!data.titulo || !data.responsavel_id) return;
    await base44.entities.Tarefa.create({
      ...data,
      criado_por: user?.email,
      status: "pendente",
      prioridade: data.prioridade || "media",
    });
    setOpen(false); setData({}); load();
  };

  return (
    <div>
      <PageTitle title="Tarefas" subtitle={gestor ? "Visão do gestor" : "Atribuídas a você"}
        action={gestor ? <Button size="sm" onClick={() => { setData({ prioridade: "media" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Nova</Button> : null} />
      {items.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Sem tarefas.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <Card key={t.id} className={`p-3 ${t.status === "concluida" ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <button className="mt-0.5 shrink-0" onClick={() => t.status !== "concluida" && concluir(t)}>
                  {t.status === "concluida" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${t.status === "concluida" ? "line-through" : ""}`}>{t.titulo}</div>
                  {t.descricao && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</div>}
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    {t.data_limite && <span className="flex items-center gap-1 text-muted-foreground"><ClockIcon className="w-3 h-3" />{format(new Date(t.data_limite), "dd/MM")}</span>}
                    <span className={PRI_CLS[t.prioridade]}>{t.prioridade}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {gestor && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={data.titulo || ""} onChange={(e) => setData({ ...data, titulo: e.target.value })} />
              <Select value={data.responsavel_id || ""} onValueChange={(v) => setData({ ...data, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={data.data_limite || ""} onChange={(e) => setData({ ...data, data_limite: e.target.value })} />
              <Select value={data.prioridade || "media"} onValueChange={(v) => setData({ ...data, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Textarea rows={3} placeholder="Descrição" value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={criar} disabled={!data.titulo || !data.responsavel_id}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}