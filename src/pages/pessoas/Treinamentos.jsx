import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";
import { format } from "date-fns";

const empty = () => ({ titulo: "", descricao: "", data: new Date().toISOString().slice(0, 10), carga_horaria: 0, instrutor: "", participantes: [] });

export default function Treinamentos() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState({ open: false, record: null });
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => setItems(await base44.entities.Treinamento.list("-data", 200));
  useEffect(() => { load(); }, []);

  const open = (r = null) => { setData(r ? { ...r } : empty()); setDialog({ open: true, record: r }); };
  const close = () => setDialog({ open: false, record: null });

  const salvar = async () => {
    if (!data.titulo) return;
    setSaving(true);
    if (dialog.record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Treinamento.update(id, rest);
    } else {
      await base44.entities.Treinamento.create(data);
    }
    setSaving(false); close(); load();
  };

  return (
    <PageShell
      title="Treinamentos"
      description="Treinamentos realizados, carga e participantes."
      actions={<Button onClick={() => open()}><Plus className="w-4 h-4 mr-1.5" />Novo treinamento</Button>}
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Instrutor</TableHead>
              <TableHead>Carga (h)</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Nenhum treinamento.</TableCell></TableRow>
            ) : items.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.data ? format(new Date(t.data + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{t.titulo}</TableCell>
                <TableCell>{t.instrutor || "—"}</TableCell>
                <TableCell>{t.carga_horaria || 0}h</TableCell>
                <TableCell>{(t.participantes || []).length}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(t)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.record ? "Editar treinamento" : "Novo treinamento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Título" required><Input value={data.titulo} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Data"><Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} /></Field>
              <Field label="Instrutor"><Input value={data.instrutor || ""} onChange={(e) => setData({ ...data, instrutor: e.target.value })} /></Field>
              <Field label="Carga (h)"><Input type="number" value={data.carga_horaria ?? ""} onChange={(e) => setData({ ...data, carga_horaria: parseFloat(e.target.value) || 0 })} /></Field>
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