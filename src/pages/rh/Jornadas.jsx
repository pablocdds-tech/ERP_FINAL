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

const DIAS = [
  { v: 1, n: "Seg" }, { v: 2, n: "Ter" }, { v: 3, n: "Qua" },
  { v: 4, n: "Qui" }, { v: 5, n: "Sex" }, { v: 6, n: "Sáb" }, { v: 0, n: "Dom" },
];

const empty = () => ({
  nome: "", descricao: "",
  dias_semana: [1, 2, 3, 4, 5],
  hora_entrada: "08:00",
  hora_intervalo_saida: "12:00",
  hora_intervalo_volta: "13:00",
  hora_saida: "17:00",
  carga_horaria_diaria_min: 480,
  carga_horaria_semanal_min: 2640,
  tolerancia_atraso_min: 10,
  tolerancia_saida_antecipada_min: 10,
  ativo: true,
});

const fmtDias = (arr) => DIAS.filter((d) => (arr || []).includes(d.v)).map((d) => d.n).join(", ") || "—";
const fmtMin = (m) => `${Math.floor((m || 0) / 60)}h${String((m || 0) % 60).padStart(2, "0")}`;

export default function Jornadas() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = () => base44.entities.JornadaTrabalho.list("-created_date", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...empty(), ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.JornadaTrabalho.update(r.id, { ativo: r.ativo === false }); load(); };
  const toggleDia = (v) => {
    const set = new Set(data.dias_semana || []);
    set.has(v) ? set.delete(v) : set.add(v);
    setData({ ...data, dias_semana: Array.from(set).sort() });
  };

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.JornadaTrabalho.update(id, rest); }
    else await base44.entities.JornadaTrabalho.create(data);
    setOpen(false); load();
  };

  return (
    <PageShell title="Jornadas e Escalas" description="Templates de jornada (6x1, 12x36, etc). A escala diária por colaborador continua em 'Escalas'."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Nova jornada</Button>}>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Dias</TableHead><TableHead>Entrada</TableHead>
            <TableHead>Intervalo</TableHead><TableHead>Saída</TableHead><TableHead>Carga diária</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma jornada cadastrada.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDias(r.dias_semana)}</TableCell>
                <TableCell className="font-mono text-xs">{r.hora_entrada || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.hora_intervalo_saida && r.hora_intervalo_volta ? `${r.hora_intervalo_saida}–${r.hora_intervalo_volta}` : "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.hora_saida || "—"}</TableCell>
                <TableCell className="text-xs">{fmtMin(r.carga_horaria_diaria_min)}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{data.id ? "Editar jornada" : "Nova jornada"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} placeholder="Ex: 6x1, 12x36, Meio Período" /></Field>
            <Field label="Dias da semana" className="col-span-2">
              <div className="flex gap-1.5 flex-wrap">
                {DIAS.map((d) => {
                  const sel = (data.dias_semana || []).includes(d.v);
                  return (
                    <button key={d.v} type="button" onClick={() => toggleDia(d.v)}
                      className={`h-8 px-3 rounded-md text-xs border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"}`}>
                      {d.n}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Hora de entrada"><Input type="time" value={data.hora_entrada || ""} onChange={(e) => setData({ ...data, hora_entrada: e.target.value })} /></Field>
            <Field label="Hora de saída final"><Input type="time" value={data.hora_saida || ""} onChange={(e) => setData({ ...data, hora_saida: e.target.value })} /></Field>
            <Field label="Saída p/ intervalo"><Input type="time" value={data.hora_intervalo_saida || ""} onChange={(e) => setData({ ...data, hora_intervalo_saida: e.target.value })} /></Field>
            <Field label="Retorno do intervalo"><Input type="time" value={data.hora_intervalo_volta || ""} onChange={(e) => setData({ ...data, hora_intervalo_volta: e.target.value })} /></Field>
            <Field label="Carga diária (min)"><Input type="number" value={data.carga_horaria_diaria_min ?? ""} onChange={(e) => setData({ ...data, carga_horaria_diaria_min: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Carga semanal (min)"><Input type="number" value={data.carga_horaria_semanal_min ?? ""} onChange={(e) => setData({ ...data, carga_horaria_semanal_min: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Tolerância de atraso (min)"><Input type="number" value={data.tolerancia_atraso_min ?? ""} onChange={(e) => setData({ ...data, tolerancia_atraso_min: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Tolerância de saída antecipada (min)"><Input type="number" value={data.tolerancia_saida_antecipada_min ?? ""} onChange={(e) => setData({ ...data, tolerancia_saida_antecipada_min: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="j-a" />
              <Label htmlFor="j-a">{data.ativo !== false ? "Ativa" : "Inativa"}</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}