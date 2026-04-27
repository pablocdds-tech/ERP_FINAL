import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import EscalaDialog from "@/components/rh/EscalaDialog";
import { format } from "date-fns";

const TIPO_COLOR = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  folga: "bg-slate-100 text-slate-600 border-slate-200",
  feriado: "bg-purple-50 text-purple-700 border-purple-200",
  ferias: "bg-amber-50 text-amber-700 border-amber-200",
  afastamento: "bg-red-50 text-red-700 border-red-200",
};

export default function Escalas() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [dataDe, setDataDe] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [dataAte, setDataAte] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [colFilter, setColFilter] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, record: null });

  const load = async () => {
    const [e, c] = await Promise.all([
      base44.entities.Escala.list("data", 1000),
      base44.entities.Colaborador.list("nome", 500),
    ]);
    setItems(e); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((e) => {
    if (e.data < dataDe || e.data > dataAte) return false;
    if (colFilter !== "todos" && e.colaborador_id !== colFilter) return false;
    return true;
  }), [items, dataDe, dataAte, colFilter]);

  const remover = async (e) => {
    if (!confirm("Remover esta escala?")) return;
    await base44.entities.Escala.delete(e.id);
    load();
  };

  return (
    <PageShell
      title="Escalas e Jornadas"
      description="Programe entradas, saídas, folgas e férias dos colaboradores."
      actions={<Button onClick={() => setDialog({ open: true, record: null })}><Plus className="w-4 h-4 mr-1.5" />Nova escala</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="md:w-[170px]" />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="md:w-[170px]" />
          <Select value={colFilter} onValueChange={setColFilter}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos colaboradores</SelectItem>
              {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem escalas no período.</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell>{e.data ? format(new Date(e.data + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{colNome(e.colaborador_id)}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${TIPO_COLOR[e.tipo] || ""}`}>{e.tipo}</Badge></TableCell>
                <TableCell>{e.tipo === "normal" ? e.hora_entrada : "—"}</TableCell>
                <TableCell>{e.tipo === "normal" ? e.hora_saida : "—"}</TableCell>
                <TableCell>{e.tipo === "normal" ? `${e.intervalo_minutos || 0} min` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, record: e })}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remover(e)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <EscalaDialog open={dialog.open} record={dialog.record} onClose={() => setDialog({ open: false, record: null })} onSaved={load} />
    </PageShell>
  );
}