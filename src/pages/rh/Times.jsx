import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Power } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import Field from "@/components/cadastros/Field";

const empty = () => ({ nome: "", codigo: "", descricao: "", departamento_id: "", loja_id: "", ativo: true });

export default function Times() {
  const [items, setItems] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = async () => {
    const [t, d, l] = await Promise.all([
      base44.entities.Time.list("-created_date", 200),
      base44.entities.Departamento.filter({ ativo: true }),
      base44.entities.Loja.filter({ ativo: true }),
    ]);
    setItems(t); setDepartamentos(d); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.Time.update(r.id, { ativo: r.ativo === false }); load(); };

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Time.update(id, rest); }
    else await base44.entities.Time.create(data);
    setOpen(false); load();
  };

  const departamentoNome = (id) => departamentos.find((d) => d.id === id)?.nome || "—";
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  return (
    <PageShell title="Times / Setores" description="Cozinha, Atendimento, Entregas, Caixa, Limpeza, etc."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo time</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Departamento</TableHead><TableHead>Loja</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum time.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{departamentoNome(r.departamento_id)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.loja_id ? lojaNome(r.loja_id) : "Todas"}</TableCell>
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
          <DialogHeader><DialogTitle>{data.id ? "Editar time" : "Novo time"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Código"><Input value={data.codigo || ""} onChange={(e) => setData({ ...data, codigo: e.target.value })} /></Field>
            <Field label="Departamento">
              <Select value={data.departamento_id || "__none__"} onValueChange={(v) => setData({ ...data, departamento_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loja" className="col-span-2" hint="Vazio = time corporativo / todas as lojas">
              <Select value={data.loja_id || "__none__"} onValueChange={(v) => setData({ ...data, loja_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Todas as lojas —</SelectItem>
                  {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="t-a" />
              <Label htmlFor="t-a">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}