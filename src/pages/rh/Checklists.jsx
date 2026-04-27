import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import Field from "@/components/cadastros/Field";

const empty = () => ({ titulo: "", descricao: "", frequencia: "diaria", itens: [], ativo: true });

export default function Checklists() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());
  const load = () => base44.entities.Checklist.list("-created_date", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...r, itens: r.itens || [] }); setOpen(true); };
  const salvar = async () => {
    if (!data.titulo) return;
    const itens = (data.itens || []).filter((i) => i.texto?.trim()).map((i, idx) => ({
      id: i.id || `i_${idx}_${Date.now()}`, texto: i.texto, obrigatorio: i.obrigatorio !== false,
    }));
    const payload = { ...data, itens };
    if (payload.id) { const { id, ...rest } = payload; await base44.entities.Checklist.update(id, rest); }
    else await base44.entities.Checklist.create(payload);
    setOpen(false); load();
  };
  const addItem = () => setData({ ...data, itens: [...(data.itens || []), { texto: "", obrigatorio: true }] });
  const setItem = (idx, k, v) => {
    const arr = [...(data.itens || [])]; arr[idx] = { ...arr[idx], [k]: v };
    setData({ ...data, itens: arr });
  };
  const removeItem = (idx) => setData({ ...data, itens: (data.itens || []).filter((_, i) => i !== idx) });

  return (
    <PageShell title="Checklists" description="Modelos de checklist (itens obrigatórios e não obrigatórios)."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo checklist</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Título</TableHead><TableHead>Frequência</TableHead><TableHead>Itens</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Sem checklists.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell>{c.frequencia}</TableCell>
                <TableCell>{(c.itens || []).length}</TableCell>
                <TableCell><StatusBadge ativo={c.ativo} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(c)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{data.id ? "Editar checklist" : "Novo checklist"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Título" required className="col-span-2"><Input value={data.titulo} onChange={(e) => setData({ ...data, titulo: e.target.value })} /></Field>
            <Field label="Frequência">
              <Select value={data.frequencia} onValueChange={(v) => setData({ ...data, frequencia: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem><SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Itens</label>
                <Button size="sm" variant="outline" type="button" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {(data.itens || []).length === 0 && <div className="text-xs text-muted-foreground py-3 text-center">Nenhum item.</div>}
                {(data.itens || []).map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={it.texto || ""} placeholder="Texto do item" onChange={(e) => setItem(idx, "texto", e.target.value)} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(idx)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.titulo}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}