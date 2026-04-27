import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import PageShell from "@/components/rotinas/PageShell";

// Listagem das auditorias (geradas a partir de checklists com itens não conformes)
export default function Auditorias() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);

  const load = async () => {
    const [a, l] = await Promise.all([
      base44.entities.Auditoria.list("-created_date", 200),
      base44.entities.Loja.list(),
    ]);
    setItems(a); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";
  const scoreCls = (s) => s >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s >= 70 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

  return (
    <PageShell
      title="Auditorias"
      description="Auditorias internas — score por loja a partir de checklists executados."
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead>Loja</TableHead>
            <TableHead>Auditor</TableHead>
            <TableHead className="text-center">OK / Total</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-center">Ocorrências</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma auditoria registrada.</TableCell></TableRow>
            ) : items.map((a) => (
              <TableRow key={a.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{a.data ? format(new Date(a.data), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{a.titulo}</TableCell>
                <TableCell className="text-xs">{lojaNome(a.loja_id)}</TableCell>
                <TableCell className="text-xs">{a.auditor_email || "—"}</TableCell>
                <TableCell className="text-center text-xs">{a.itens_ok || 0} / {a.itens_total || 0}</TableCell>
                <TableCell className="text-center">
                  {a.score != null && <Badge variant="outline" className={`font-mono ${scoreCls(a.score)}`}>{Math.round(a.score)}%</Badge>}
                </TableCell>
                <TableCell className="text-center text-xs">{a.ocorrencias_geradas || 0}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{a.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}