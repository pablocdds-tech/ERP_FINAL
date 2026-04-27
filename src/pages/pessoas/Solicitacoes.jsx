import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ExternalLink } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { decidirSolicitacao } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

const TIPO_LABEL = {
  folga: "Folga", troca_turno: "Troca de turno",
  justificativa_atraso: "Justificativa de atraso", justificativa_falta: "Justificativa de falta",
  atestado: "Atestado", ajuste_ponto: "Ajuste de ponto", outro: "Outro",
};
const STATUS_COLOR = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejeitada: "bg-red-50 text-red-700 border-red-200",
  cancelada: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Solicitacoes() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pendente");

  const load = async () => {
    const [s, c] = await Promise.all([
      base44.entities.SolicitacaoRH.list("-created_date", 500),
      base44.entities.Colaborador.list("nome", 500),
    ]);
    setItems(s); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() =>
    items.filter((i) => statusFilter === "todos" || i.status === statusFilter), [items, statusFilter]);

  const aprovar = async (s) => { const r = prompt("Resposta (opcional):") || ""; await decidirSolicitacao(s, "aprovada", r); load(); };
  const rejeitar = async (s) => { const r = prompt("Motivo:"); if (r === null) return; await decidirSolicitacao(s, "rejeitada", r); load(); };

  return (
    <PageShell title="Solicitações" description="Folgas, trocas, atestados e ajustes de ponto solicitados pelos colaboradores.">
      <Card className="p-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="rejeitada">Rejeitadas</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Anexo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem solicitações.</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-sm">{s.data_solicitacao ? format(new Date(s.data_solicitacao + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{colNome(s.colaborador_id)}</TableCell>
                <TableCell>{TIPO_LABEL[s.tipo] || s.tipo}</TableCell>
                <TableCell className="text-sm">{s.data_referencia ? format(new Date(s.data_referencia + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-sm max-w-xs truncate" title={s.descricao}>{s.descricao || "—"}</TableCell>
                <TableCell>
                  {s.anexo_url ? (
                    <a href={s.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                      Ver <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_COLOR[s.status] || ""}`}>{s.status}</Badge></TableCell>
                <TableCell>
                  {s.status === "pendente" && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => aprovar(s)}><Check className="w-3.5 h-3.5 text-emerald-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => rejeitar(s)}><X className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}