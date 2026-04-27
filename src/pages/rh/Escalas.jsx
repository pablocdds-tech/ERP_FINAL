import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { format } from "date-fns";

const empty = () => ({
  colaborador_id: "", loja_id: "", data: new Date().toISOString().slice(0, 10),
  hora_entrada: "08:00", hora_saida: "17:00", intervalo_minutos: 60, tipo: "normal",
});
const TIPO_LABEL = { normal: "Normal", folga: "Folga", feriado: "Feriado", ferias: "Férias", afastamento: "Afastamento" };

export default function Escalas() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [colF, setColF] = useState("todos");
  const [dataDe, setDataDe] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [dataAte, setDataAte] = useState(new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = async () => {
    const [e, c] = await Promise.all([
      base44.entities.Escala.list("-data", 1000),
      base44.entities.Colaborador.filter({ status: "ativo" }),
    ]);
    setItems(e); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((e) => {
    if (colF !== "todos" && e.colaborador_id !== colF) return false;
    if (dataDe && e.data < dataDe) return false;
    if (dataAte && e.data > dataAte) return false;
    return true;
  }), [items, colF, dataDe, dataAte]);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const remover = async (r) => { await base44.entities.Escala.delete(r.id); load(); };
  const salvar = async () => {
    if (!data.colaborador_id || !data.data) return;
    const col = colaboradores.find((c) => c.id === data.colaborador_id);
    const payload = { ...data, loja_id: data.loja_id || col?.loja_id };
    if (data.id) { const { id, ...rest } = payload; await base44.entities.Escala.update(id, rest); }
    else await base44.entities.Escala.create(payload);
    setOpen(false); load();
  };

  return (
    <PageShell title="Escalas e Jornadas" description="Programação de turnos diária por colaborador."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Nova escala</Button>}>
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={colF} onValueChange={setColF}>
            <SelectTrigger className="w-full md:w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos colaboradores</SelectItem>
              {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Entrada</TableHead><TableHead>Saída</TableHead><TableHead>Intervalo</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem escalas.</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell>{format(new Date(e.data), "dd/MM/yyyy")}</TableCell>
                <TableCell className="font-medium">{colNome(e.colaborador_id)}</TableCell>
                <TableCell>{TIPO_LABEL[e.tipo]}</TableCell>
                <TableCell>{e.tipo === "normal" ? e.hora_entrada : "—"}</TableCell>
                <TableCell>{e.tipo === "normal" ? e.hora_saida : "—"}</TableCell>
                <TableCell>{e.tipo === "normal" ? `${e.intervalo_minutos || 0} min` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(e)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remover(e)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{data.id ? "Editar escala" : "Nova escala"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Colaborador" required className="col-span-2">
              <Select value={data.colaborador_id} onValueChange={(v) => setData({ ...data, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Data" required><Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} /></Field>
            <Field label="Tipo" required>
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {data.tipo === "normal" && (<>
              <Field label="Hora entrada"><Input type="time" value={data.hora_entrada} onChange={(e) => setData({ ...data, hora_entrada: e.target.value })} /></Field>
              <Field label="Hora saída"><Input type="time" value={data.hora_saida} onChange={(e) => setData({ ...data, hora_saida: e.target.value })} /></Field>
              <Field label="Intervalo (min)"><Input type="number" value={data.intervalo_minutos ?? 60} onChange={(e) => setData({ ...data, intervalo_minutos: parseInt(e.target.value) || 0 })} /></Field>
            </>)}
            <Field label="Loja" className="col-span-2"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.colaborador_id}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}