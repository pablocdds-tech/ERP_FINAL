import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/rotinas/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import EquipamentoDialog from "@/components/rotinas/EquipamentoDialog";

export default function Equipamentos() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [dialog, setDialog] = useState({ open: false, record: null });

  const load = async () => {
    const [e, l] = await Promise.all([
      base44.entities.Equipamento.list("nome", 500),
      base44.entities.Loja.list(),
    ]);
    setItems(e); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  return (
    <PageShell
      title="Equipamentos"
      description="Patrimônio com histórico de manutenções."
      actions={
        <Button onClick={() => setDialog({ open: true, record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo equipamento
        </Button>
      }
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Loja</TableHead><TableHead>Última manut.</TableHead>
            <TableHead>Próxima manut.</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem equipamentos.</TableCell></TableRow>
            ) : items.map((e) => (
              <TableRow key={e.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell className="text-xs">{e.codigo || "—"}</TableCell>
                <TableCell className="text-xs">{e.tipo || "—"}</TableCell>
                <TableCell className="text-xs">{lojaNome(e.loja_id)}</TableCell>
                <TableCell className="text-xs">{e.ultima_manutencao ? format(new Date(e.ultima_manutencao), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-xs">{e.proxima_manutencao ? format(new Date(e.proxima_manutencao), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell><StatusBadge ativo={e.ativo} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, record: e })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <EquipamentoDialog
        open={dialog.open}
        record={dialog.record}
        onClose={() => setDialog({ open: false, record: null })}
        onSaved={load}
      />
    </PageShell>
  );
}