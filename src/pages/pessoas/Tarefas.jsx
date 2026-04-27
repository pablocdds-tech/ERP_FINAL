import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { notificar } from "@/lib/rh-service";
import { format } from "date-fns";

const PRIO_COLOR = { baixa: "", media: "bg-blue-50 text-blue-700 border-blue-200", alta: "bg-red-50 text-red-700 border-red-200" };
const STATUS_COLOR = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  em_andamento: "bg-blue-50 text-blue-700 border-blue-200",
  concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelada: "bg-slate-100 text-slate-600 border-slate-200",
};
const empty = () => ({ titulo: "", descricao: "", loja_id: "", responsavel_id: "", data_limite: "", prioridade: "media", status: "pendente" });

export default function Tarefas() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [dialog, setDialog] = useState({ open: false, record: null });
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [t, c] = await Promise.all([
      base44.entities.Tarefa.list("-created_date", 500),
      base44.entities.Colaborador.list("nome", 500),
    ]);
    setItems(t); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const colEmail = (id) => colaboradores.find((c) => c.id === id)?.email;

  const open = (r = null) => { setData(r ? { ...r } : empty()); setDialog({ open: true, record: r }); };
  const close = () => setDialog({ open: false, record: null });

  const salvar = async () => {
    if (!data.titulo) return;
    setSaving(true);
    let usuario_email = null;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
    if (dialog.record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Tarefa.update(id, rest);
    } else {
      const created = await base44.entities.Tarefa.create({ ...data, criado_por: usuario_email });
      const email = colEmail(data.responsavel_id);
      if (email) {
        await notificar({
          destinatario_email: email, tipo: "tarefa", titulo: `Nova tarefa: ${data.titulo}`,
          mensagem: data.descricao || "", link: "/pwa/tarefas",
          origem_tipo: "Tarefa", origem_id: created.id,
        });
      }
    }
    setSaving(false); close(); load();
  };

  return (
    <PageShell
      title="Tarefas"
      description="Atribua tarefas para colaboradores. Cria notificação no PWA."
      actions={<Button onClick={() => open()}><Plus className="w-4 h-4 mr-1.5" />Nova tarefa</Button>}
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Título</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem tarefas.</TableCell></TableRow>
            ) : items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.titulo}</TableCell>
                <TableCell>{colNome(t.responsavel_id)}</TableCell>
                <TableCell className="text-sm">{t.data_limite ? format(new Date(t.data_limite + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${PRIO_COLOR[t.prioridade] || ""}`}>{t.prioridade}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_COLOR[t.status] || ""}`}>{t.status}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(t)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.record ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Título" required><Input value={data.titulo} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Responsável">
                <Select value={data.responsavel_id || "__none__"} onValueChange={(v) => setData({ ...data, responsavel_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem responsável —</SelectItem>
                    {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
              <Field label="Prazo"><Input type="date" value={data.data_limite || ""} onChange={(e) => setData({ ...data, data_limite: e.target.value })} /></Field>
              <Field label="Prioridade">
                <Select value={data.prioridade} onValueChange={(v) => setData({ ...data, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !data.titulo}>{saving ? "..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}