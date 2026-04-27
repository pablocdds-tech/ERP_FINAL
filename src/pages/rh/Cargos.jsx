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

const empty = () => ({ nome: "", descricao: "", carga_horaria_semanal: 44, salario_base: 0, ativo: true });

export default function Cargos() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = () => base44.entities.Cargo.list("-created_date", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.Cargo.update(r.id, { ativo: r.ativo === false }); load(); };

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Cargo.update(id, rest); }
    else await base44.entities.Cargo.create(data);
    setOpen(false); load();
  };

  return (
    <PageShell title="Cargos" description="Cargos, jornada e salário base."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo cargo</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Carga semanal</TableHead><TableHead>Salário base</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum cargo.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{r.carga_horaria_semanal || 44}h</TableCell>
                <TableCell className="font-mono">R$ {Number(r.salario_base || 0).toFixed(2)}</TableCell>
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
          <DialogHeader><DialogTitle>{data.id ? "Editar cargo" : "Novo cargo"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Carga horária semanal"><Input type="number" value={data.carga_horaria_semanal ?? ""} onChange={(e) => setData({ ...data, carga_horaria_semanal: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Salário base"><Input type="number" step="0.01" value={data.salario_base ?? ""} onChange={(e) => setData({ ...data, salario_base: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="cg-a" />
              <Label htmlFor="cg-a">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}