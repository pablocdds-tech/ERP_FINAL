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
import OSDialog from "@/components/rotinas/OSDialog";

export default function OrdensServico() {
  const [items, setItems] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [statusF, setStatusF] = useState("todos");
  const [tipoF, setTipoF] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, record: null });

  const load = async () => {
    const [o, e] = await Promise.all([
      base44.entities.OrdemServico.list("-created_date", 500),
      base44.entities.Equipamento.list(),
    ]);
    setItems(o); setEquipamentos(e);
  };
  useEffect(() => { load(); }, []);

  const equipNome = (id) => equipamentos.find((e) => e.id === id)?.nome || "—";
  const filtered = items.filter((o) =>
    (statusF === "todos" || o.status === statusF) &&
    (tipoF === "todos" || o.tipo === tipoF)
  );

  return (
    <PageShell
      title="Ordens de Serviço"
      description="OS preventivas e corretivas — geram custo no financeiro ao concluir."
      actions={
        <Button onClick={() => setDialog({ open: true, record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova OS
        </Button>
      }
    >
      <Card className="p-4 mb-4 flex gap-3 flex-wrap">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="agendada">Agendadas</SelectItem>
            <SelectItem value="em_execucao">Em execução</SelectItem>
            <SelectItem value="concluida">Concluídas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoF} onValueChange={setTipoF}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos tipos</SelectItem>
            <SelectItem value="preventiva">Preventiva</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="instalacao">Instalação</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Abertura</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Equipamento</TableHead><TableHead>Previsão</TableHead>
            <TableHead className="text-right">Custo</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem OS.</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{o.data_abertura ? format(new Date(o.data_abertura), "dd/MM/yy") : "—"}</TableCell>
                <TableCell className="font-medium">{o.titulo}</TableCell>
                <TableCell className="text-xs">{o.tipo}</TableCell>
                <TableCell className="text-xs">{equipNome(o.equipamento_id)}</TableCell>
                <TableCell className="text-xs">{o.data_prevista ? format(new Date(o.data_prevista), "dd/MM/yy") : "—"}</TableCell>
                <TableCell className="text-xs text-right font-mono">
                  R$ {Number(o.custo_real ?? o.custo_previsto ?? 0).toFixed(2)}
                </TableCell>
                <TableCell><StatusBadge status={o.status} kind="os" /></TableCell>
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

      <OSDialog open={dialog.open} record={dialog.record}
        onClose={() => setDialog({ open: false, record: null })}
        onSaved={load} />
    </PageShell>
  );
}