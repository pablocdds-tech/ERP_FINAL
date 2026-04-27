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
  const [dialog, setDialog] = useState({ open: false, record: null });
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => setItems(await base44.entities.Cargo.list("-created_date", 200));
  useEffect(() => { load(); }, []);

  const open = (r = null) => { setData(r ? { ...r } : empty()); setDialog({ open: true, record: r }); };
  const close = () => setDialog({ open: false, record: null });

  const salvar = async () => {
    if (!data.nome) return;
    setSaving(true);
    if (dialog.record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Cargo.update(id, rest);
    } else {
      await base44.entities.Cargo.create(data);
    }
    setSaving(false); close(); load();
  };

  const toggle = async (c) => {
    await base44.entities.Cargo.update(c.id, { ativo: c.ativo === false });
    load();
  };

  return (
    <PageShell
      title="Cargos"
      description="Cargos disponíveis na empresa, jornada e salário base."
      actions={<Button onClick={() => open()}><Plus className="w-4 h-4 mr-1.5" />Novo cargo</Button>}
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Cargo</TableHead>
              <TableHead>Carga semanal</TableHead>
              <TableHead className="text-right">Salário base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum cargo.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.carga_horaria_semanal || 0}h</TableCell>
                <TableCell className="text-right font-mono">R$ {Number(c.salario_base || 0).toFixed(2)}</TableCell>
                <TableCell><StatusBadge ativo={c.ativo} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(c)}><Power className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.record ? "Editar cargo" : "Novo cargo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Nome" required><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carga horária semanal"><Input type="number" value={data.carga_horaria_semanal ?? ""} onChange={(e) => setData({ ...data, carga_horaria_semanal: parseFloat(e.target.value) || 0 })} /></Field>
              <Field label="Salário base"><Input type="number" step="0.01" value={data.salario_base ?? ""} onChange={(e) => setData({ ...data, salario_base: parseFloat(e.target.value) || 0 })} /></Field>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="cargo-ativo" />
              <Label htmlFor="cargo-ativo" className="cursor-pointer">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !data.nome}>{saving ? "..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}