import { useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";

const TIPOS = [
  { v: "nacional", n: "Nacional" },
  { v: "estadual", n: "Estadual" },
  { v: "municipal", n: "Municipal" },
  { v: "empresa", n: "Empresa" },
];
const empty = () => ({ data: new Date().toISOString().slice(0, 10), nome: "", tipo: "nacional", loja_id: "", trabalhado: false, observacoes: "", ativo: true });

export default function Feriados() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [tipoF, setTipoF] = useState("todos");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = async () => {
    const [f, l] = await Promise.all([
      base44.entities.Feriado.list("-data", 500),
      base44.entities.Loja.filter({ ativo: true }),
    ]);
    setItems(f); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((r) => tipoF === "todos" || r.tipo === tipoF), [items, tipoF]);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...empty(), ...r }); setOpen(true); };
  const remover = async (r) => { await base44.entities.Feriado.delete(r.id); load(); };

  const salvar = async () => {
    if (!data.data || !data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Feriado.update(id, rest); }
    else await base44.entities.Feriado.create(data);
    setOpen(false); load();
  };

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "Todas";
  const tipoNome = (v) => TIPOS.find((t) => t.v === v)?.n || v;

  return (
    <PageShell title="Calendário de Feriados" description="Feriados nacionais, estaduais, municipais e da empresa."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo feriado</Button>}>
      <Card className="p-4 mb-4">
        <Select value={tipoF} onValueChange={setTipoF}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.n}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Loja</TableHead><TableHead>Trabalhado</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Nenhum feriado.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{format(new Date(r.data), "dd/MM/yyyy")}</TableCell>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-xs">{tipoNome(r.tipo)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lojaNome(r.loja_id)}</TableCell>
                <TableCell className="text-xs">{r.trabalhado ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remover(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{data.id ? "Editar feriado" : "Novo feriado"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data" required><Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} /></Field>
            <Field label="Tipo" required>
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.n}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} placeholder="Ex: Independência do Brasil" /></Field>
            <Field label="Loja afetada" className="col-span-2" hint="Vazio = todas as lojas">
              <Select value={data.loja_id || "__none__"} onValueChange={(v) => setData({ ...data, loja_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Todas —</SelectItem>
                  {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={!!data.trabalhado} onCheckedChange={(v) => setData({ ...data, trabalhado: v })} id="f-t" />
              <Label htmlFor="f-t">{data.trabalhado ? "A empresa opera neste feriado" : "Não trabalhado"}</Label>
            </div>
            <Field label="Observações" className="col-span-2"><Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome || !data.data}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}