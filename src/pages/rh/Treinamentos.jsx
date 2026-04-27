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

export default function Treinamentos() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({});
  const load = () => base44.entities.Treinamento.list("-data", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData({ data: new Date().toISOString().slice(0, 10), participantes: [] }); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const salvar = async () => {
    if (!data.titulo) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Treinamento.update(id, rest); }
    else await base44.entities.Treinamento.create(data);
    setOpen(false); load();
  };

  return (
    <PageShell title="Treinamentos" description="Eventos de treinamento, presenças e certificados."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo treinamento</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead>Instrutor</TableHead>
            <TableHead>Carga</TableHead><TableHead>Participantes</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem treinamentos.</TableCell></TableRow>
            ) : items.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/30">
                <TableCell>{t.data ? format(new Date(t.data), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{t.titulo}</TableCell>
                <TableCell>{t.instrutor || "—"}</TableCell>
                <TableCell>{t.carga_horaria ? `${t.carga_horaria}h` : "—"}</TableCell>
                <TableCell>{(t.participantes || []).length}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(t)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{data.id ? "Editar treinamento" : "Novo treinamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Título" required className="col-span-2"><Input value={data.titulo || ""} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Data"><Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} /></Field>
            <Field label="Carga (h)"><Input type="number" value={data.carga_horaria ?? ""} onChange={(e) => setData({ ...data, carga_horaria: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Instrutor" className="col-span-2"><Input value={data.instrutor || ""} onChange={(e) => setData({ ...data, instrutor: e.target.value })} /></Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={3} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.titulo}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}