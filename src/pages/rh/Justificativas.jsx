import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Plus } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import NovaJustificativaDialog from "@/components/rh/NovaJustificativaDialog";
import { format } from "date-fns";

const STATUS_CLS = {
  aprovada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejeitada: "bg-red-100 text-red-700 border-red-200",
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function Justificativas() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [tiposAbono, setTiposAbono] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [busca, setBusca] = useState("");
  const [novaOpen, setNovaOpen] = useState(false);

  const carregar = async () => {
    const [s, c, t] = await Promise.all([
      base44.entities.SolicitacaoRH.list("-created_date", 2000),
      base44.entities.Colaborador.list("", 5000),
      base44.entities.TipoAbono.list().catch(() => []),
    ]);
    setSolicitacoes(s || []); setColaboradores(c || []); setTiposAbono(t || []);
  };
  useEffect(() => { carregar(); }, []);

  const colMap = useMemo(() => Object.fromEntries(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const tipoMap = useMemo(() => Object.fromEntries(tiposAbono.map((t) => [t.id, t])), [tiposAbono]);

  const lista = solicitacoes
    .filter((s) => ["abono_falta", "abono_atraso", "atestado", "justificativa"].includes(s.tipo) || s.tipo_abono_id)
    .filter((s) => filtroStatus === "todas" || s.status === filtroStatus)
    .filter((s) => {
      if (!busca) return true;
      return colMap[s.colaborador_id]?.nome?.toLowerCase().includes(busca.toLowerCase());
    });

  return (
    <PageShell
      title="Justificativas e Atestados"
      description="Histórico de abonos, justificativas e atestados dos colaboradores."
      actions={<Button onClick={() => setNovaOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nova justificativa</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Buscar por colaborador..." value={busca} onChange={(e) => setBusca(e.target.value)} className="md:w-[280px]" />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="aprovada">Aprovadas</SelectItem>
              <SelectItem value="rejeitada">Rejeitadas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:ml-auto self-center text-sm text-muted-foreground">{lista.length} registros</div>
        </div>
      </Card>

      <NovaJustificativaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        colaboradores={colaboradores}
        tiposAbono={tiposAbono}
        onSaved={carregar}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Anexo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">Nenhuma justificativa encontrada.</TableCell></TableRow>
            ) : lista.map((s) => {
              const c = colMap[s.colaborador_id];
              const t = tipoMap[s.tipo_abono_id];
              return (
                <TableRow key={s.id} className="text-sm align-top">
                  <TableCell className="text-xs whitespace-nowrap">{s.data_referencia ? format(new Date(s.data_referencia + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{c?.nome || "—"}</TableCell>
                  <TableCell className="text-xs">{t?.nome || s.tipo}</TableCell>
                  <TableCell className="text-xs max-w-[300px]">{s.descricao || "—"}</TableCell>
                  <TableCell>
                    {s.anexo_url ? (
                      <Button asChild size="sm" variant="ghost" className="h-7"><a href={s.anexo_url} target="_blank" rel="noreferrer"><FileText className="w-3 h-3 mr-1" />Ver<ExternalLink className="w-3 h-3 ml-1" /></a></Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_CLS[s.status] || ""}>{s.status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}