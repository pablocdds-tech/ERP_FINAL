import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Power } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import Field from "@/components/cadastros/Field";

const empty = () => ({ nome: "", codigo: "", descricao: "", ativo: true });

export default function Departamentos() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = () => base44.entities.Departamento.list("-created_date", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.Departamento.update(r.id, { ativo: r.ativo === false }); load(); };

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Departamento.update(id, rest); }
    else await base44.entities.Departamento.create(data);
    setOpen(false); load();
  };

  return (
    <PageShell title="Departamentos" description="Áreas organizacionais (Operação, Administrativo, Delivery, etc.)."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo departamento</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum departamento.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-muted-foreground">{r.codigo || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.descricao || "—"}</TableCell>
                <TableCell><StatusBadge ativo={r.ativo} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(r)}><Power className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{data.id ? "Editar departamento" : "Novo departamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Código"><Input value={data.codigo || ""} onChange={(e) => setData({ ...data, codigo: e.target.value })} /></Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="dep-a" />
              <Label htmlFor="dep-a">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}