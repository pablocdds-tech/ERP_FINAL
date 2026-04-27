import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import PageShell from "@/components/rotinas/PageShell";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import Field from "@/components/cadastros/Field";
import ComentariosTimeline from "@/components/rotinas/ComentariosTimeline";
import { format } from "date-fns";

const STATUS_CLS = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  em_andamento: "bg-blue-50 text-blue-700 border-blue-200",
  concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelada: "bg-slate-100 text-slate-600 border-slate-200",
};
const PRI_CLS = { baixa: "text-slate-500", media: "text-amber-700", alta: "text-destructive font-medium" };

export default function Tarefas() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [statusF, setStatusF] = useState("todos");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({});

  const load = async () => {
    const [t, c] = await Promise.all([
      base44.entities.Tarefa.list("-created_date", 500),
      base44.entities.Colaborador.filter({ status: "ativo" }),
    ]);
    setItems(t); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);
  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const filtered = items.filter((t) => statusF === "todos" || t.status === statusF);

  const novo = () => { setData({ status: "pendente", prioridade: "media" }); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const salvar = async () => {
    if (!data.titulo) return;
    let payload = { ...data };
    if (!payload.criado_por) try { payload.criado_por = (await base44.auth.me())?.email; } catch { /* */ }
    if (payload.status === "concluida" && !payload.concluida_em) payload.concluida_em = new Date().toISOString();
    if (payload.id) { const { id, ...rest } = payload; await base44.entities.Tarefa.update(id, rest); }
    else await base44.entities.Tarefa.create(payload);
    setOpen(false); load();
  };

  return (
    <PageShell title="Tarefas" description="Tarefas atribuídas a colaboradores."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Nova tarefa</Button>}>
      <Card className="p-4 mb-4">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Título</TableHead><TableHead>Responsável</TableHead><TableHead>Prazo</TableHead>
            <TableHead>Origem</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem tarefas.</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{t.titulo}</TableCell>
                <TableCell>{colNome(t.responsavel_id)}</TableCell>
                <TableCell className="text-xs">{t.data_limite ? format(new Date(t.data_limite), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-xs">{t.origem_tipo || "manual"}</TableCell>
                <TableCell><span className={`text-xs ${PRI_CLS[t.prioridade]}`}>{t.prioridade}</span></TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_CLS[t.status]}`}>{t.status}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(t)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{data.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Título" required className="col-span-2"><Input value={data.titulo || ""} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Responsável" required className="col-span-2">
              <Select value={data.responsavel_id || ""} onValueChange={(v) => setData({ ...data, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
            <Field label="Prazo"><Input type="date" value={data.data_limite || ""} onChange={(e) => setData({ ...data, data_limite: e.target.value })} /></Field>
            <Field label="Prioridade">
              <Select value={data.prioridade || "media"} onValueChange={(v) => setData({ ...data, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={data.status || "pendente"} onValueChange={(v) => setData({ ...data, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem><SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={3} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
          </div>
          {data.id && <div className="mt-3"><ComentariosTimeline entidade="Tarefa" entidade_id={data.id} /></div>}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.titulo}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}