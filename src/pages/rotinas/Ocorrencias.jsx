import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/rotinas/PageShell";
import StatusBadge from "@/components/rotinas/StatusBadge";
import OcorrenciaDialog from "@/components/rotinas/OcorrenciaDialog";

const SEV_CLS = {
  baixa: "text-slate-500", media: "text-amber-700",
  alta: "text-orange-700 font-medium", critica: "text-destructive font-semibold",
};

export default function Ocorrencias() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [statusF, setStatusF] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, record: null });

  const load = async () => {
    const [o, l] = await Promise.all([
      base44.entities.OcorrenciaOperacional.list("-created_date", 500),
      base44.entities.Loja.list(),
    ]);
    setItems(o); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";
  const filtered = items.filter((o) => statusF === "todos" || o.status === statusF);

  return (
    <PageShell
      title="Ocorrências"
      description="Eventos operacionais a tratar — gerados manualmente, por checklist ou por chamado."
      actions={
        <Button onClick={() => setDialog({ open: true, record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova ocorrência
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="resolvida">Resolvidas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Loja</TableHead><TableHead>Severidade</TableHead><TableHead>Origem</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem ocorrências.</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{format(new Date(o.created_date), "dd/MM HH:mm")}</TableCell>
                <TableCell className="font-medium">{o.titulo}</TableCell>
                <TableCell className="text-xs">{o.tipo}</TableCell>
                <TableCell className="text-xs">{lojaNome(o.loja_id)}</TableCell>
                <TableCell><span className={`text-xs ${SEV_CLS[o.severidade]}`}>{o.severidade}</span></TableCell>
                <TableCell className="text-xs">{o.origem_tipo}</TableCell>
                <TableCell><StatusBadge status={o.status} kind="ocorrencia" /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, record: o })}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <OcorrenciaDialog
        open={dialog.open}
        record={dialog.record}
        onClose={() => setDialog({ open: false, record: null })}
        onSaved={load}
      />
    </PageShell>
  );
}