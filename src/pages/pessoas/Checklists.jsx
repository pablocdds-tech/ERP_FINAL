import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

const uid = () => Math.random().toString(36).slice(2, 9);
const empty = () => ({ titulo: "", descricao: "", loja_id: "", frequencia: "diaria", itens: [], ativo: true });

export default function Checklists() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState({ open: false, record: null });
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => setItems(await base44.entities.Checklist.list("-created_date", 200));
  useEffect(() => { load(); }, []);

  const open = (r = null) => { setData(r ? { ...r, itens: r.itens || [] } : empty()); setDialog({ open: true, record: r }); };
  const close = () => setDialog({ open: false, record: null });

  const addItem = () => setData({ ...data, itens: [...data.itens, { id: uid(), texto: "", obrigatorio: true }] });
  const updItem = (idx, k, v) => setData({ ...data, itens: data.itens.map((it, i) => i === idx ? { ...it, [k]: v } : it) });
  const delItem = (idx) => setData({ ...data, itens: data.itens.filter((_, i) => i !== idx) });

  const salvar = async () => {
    if (!data.titulo) return;
    setSaving(true);
    if (dialog.record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Checklist.update(id, rest);
    } else {
      await base44.entities.Checklist.create(data);
    }
    setSaving(false); close(); load();
  };

  return (
    <PageShell
      title="Checklists"
      description="Modelos de checklist que aparecem para os funcionários no PWA."
      actions={<Button onClick={() => open()}><Plus className="w-4 h-4 mr-1.5" />Novo checklist</Button>}
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Título</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum checklist.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell><span className="text-xs uppercase text-muted-foreground">{c.frequencia}</span></TableCell>
                <TableCell>{(c.itens || []).length}</TableCell>
                <TableCell><StatusBadge ativo={c.ativo} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(c)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog.record ? "Editar checklist" : "Novo checklist"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Título" required><Input value={data.titulo} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
              <Field label="Frequência">
                <Select value={data.frequencia} onValueChange={(v) => setData({ ...data, frequencia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unica">Única</SelectItem><SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Itens do checklist</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar item</Button>
              </div>
              <div className="space-y-2">
                {(data.itens || []).map((it, idx) => (
                  <div key={it.id} className="flex gap-2 items-center">
                    <Input className="flex-1" placeholder="Descrição do item" value={it.texto} onChange={(e) => updItem(idx, "texto", e.target.value)} />
                    <div className="flex items-center gap-1.5 text-xs">
                      <Switch checked={it.obrigatorio !== false} onCheckedChange={(v) => updItem(idx, "obrigatorio", v)} />
                      Obrig.
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => delItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {(data.itens || []).length === 0 && <div className="text-xs text-muted-foreground">Nenhum item. Adicione pelo menos 1.</div>}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="cl-ativo" />
              <Label htmlFor="cl-ativo" className="cursor-pointer">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
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