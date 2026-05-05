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

const empty = () => ({ nome: "", hora_inicio: "08:00", hora_fim: "17:00", loja_id: "", time_id: "", observacoes: "", ativo: true });

export default function Turnos() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [times, setTimes] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = async () => {
    const [t, l, tm] = await Promise.all([
      base44.entities.Turno.list("-created_date", 200),
      base44.entities.Loja.filter({ ativo: true }),
      base44.entities.Time.filter({ ativo: true }).catch(() => []),
    ]);
    setItems(t); setLojas(l); setTimes(tm);
  };
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...empty(), ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.Turno.update(r.id, { ativo: r.ativo === false }); load(); };

  const salvar = async () => {
    if (!data.nome || !data.hora_inicio || !data.hora_fim) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Turno.update(id, rest); }
    else await base44.entities.Turno.create(data);
    setOpen(false); load();
  };

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "Todas";
  const timeNome = (id) => times.find((t) => t.id === id)?.nome || "—";

  return (
    <PageShell title="Turnos" description="Faixas horárias por loja/setor (Manhã, Tarde, Noite)."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo turno</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead>
            <TableHead>Loja</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Nenhum turno.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="font-mono text-xs">{r.hora_inicio}</TableCell>
                <TableCell className="font-mono text-xs">{r.hora_fim}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lojaNome(r.loja_id)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{timeNome(r.time_id)}</TableCell>
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
          <DialogHeader><DialogTitle>{data.id ? "Editar turno" : "Novo turno"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} placeholder="Ex: Manhã, Tarde, Noite" /></Field>
            <Field label="Hora início" required><Input type="time" value={data.hora_inicio} onChange={(e) => setData({ ...data, hora_inicio: e.target.value })} /></Field>
            <Field label="Hora fim" required><Input type="time" value={data.hora_fim} onChange={(e) => setData({ ...data, hora_fim: e.target.value })} /></Field>
            <Field label="Loja" hint="Vazio = todas">
              <Select value={data.loja_id || "__none__"} onValueChange={(v) => setData({ ...data, loja_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Todas —</SelectItem>
                  {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Time / Setor">
              <Select value={data.time_id || "__none__"} onValueChange={(v) => setData({ ...data, time_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {times.filter((t) => !data.loja_id || !t.loja_id || t.loja_id === data.loja_id).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Observações" className="col-span-2"><Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} /></Field>
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