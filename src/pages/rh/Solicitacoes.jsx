import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { decidirSolicitacao } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

const TIPO = { folga: "Folga", troca_turno: "Troca de turno", justificativa_atraso: "Justif. atraso", justificativa_falta: "Justif. falta", atestado: "Atestado", ajuste_ponto: "Ajuste de ponto", outro: "Outro" };
const STATUS_CLS = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejeitada: "bg-destructive/10 text-destructive border-destructive/30",
  cancelada: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Solicitacoes() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [statusF, setStatusF] = useState("pendente");
  const [acao, setAcao] = useState({ open: false, sol: null, decisao: null, resposta: "" });

  const load = async () => {
    const [s, c] = await Promise.all([
      base44.entities.SolicitacaoRH.list("-created_date", 500),
      base44.entities.Colaborador.list(),
    ]);
    setItems(s); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const filtered = useMemo(() => items.filter((s) => statusF === "todos" || s.status === statusF), [items, statusF]);

  const decidir = async () => {
    await decidirSolicitacao(acao.sol, acao.decisao, acao.resposta);
    setAcao({ open: false, sol: null, decisao: null, resposta: "" });
    load();
  };

  return (
    <PageShell title="Solicitações" description="Folgas, trocas, ajustes de ponto e justificativas.">
      <Card className="p-4 mb-4">
        <Select value={statusF} onValueChange={setStatusF}>
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
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Referência</TableHead><TableHead>Descrição</TableHead><TableHead>Anexo</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem solicitações.</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{s.data_solicitacao ? format(new Date(s.data_solicitacao), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{colNome(s.colaborador_id)}</TableCell>
                <TableCell>{TIPO[s.tipo]}</TableCell>
                <TableCell className="text-xs">{s.data_referencia ? format(new Date(s.data_referencia), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-sm max-w-xs truncate">{s.descricao || "—"}</TableCell>
                <TableCell>{s.anexo_url ? <a className="text-xs text-primary underline" href={s.anexo_url} target="_blank" rel="noreferrer">Ver</a> : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_CLS[s.status]}`}>{s.status}</Badge></TableCell>
                <TableCell>
                  {s.status === "pendente" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setAcao({ open: true, sol: s, decisao: "aprovada", resposta: "" })}>
                        <Check className="w-3 h-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => setAcao({ open: true, sol: s, decisao: "rejeitada", resposta: "" })}>
                        <X className="w-3 h-3 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={acao.open} onOpenChange={(o) => !o && setAcao({ open: false, sol: null, decisao: null, resposta: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{acao.decisao === "aprovada" ? "Aprovar" : "Rejeitar"} solicitação</DialogTitle></DialogHeader>
          <Textarea rows={3} placeholder="Resposta ao colaborador (opcional)" value={acao.resposta} onChange={(e) => setAcao({ ...acao, resposta: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao({ open: false, sol: null, decisao: null, resposta: "" })}>Cancelar</Button>
            <Button onClick={decidir}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}