import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ImageIcon } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { notificar } from "@/lib/rh-service";
import { format } from "date-fns";

const PRIO_COLOR = { baixa: "", media: "bg-blue-50 text-blue-700 border-blue-200", alta: "bg-amber-50 text-amber-700 border-amber-200", critica: "bg-red-50 text-red-700 border-red-200" };
const STATUS_COLOR = {
  aberto: "bg-amber-50 text-amber-700 border-amber-200",
  em_atendimento: "bg-blue-50 text-blue-700 border-blue-200",
  resolvido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Chamados() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [statusFilter, setStatusFilter] = useState("aberto");
  const [resp, setResp] = useState({ open: false, record: null, texto: "" });

  const load = async () => {
    const [c, col] = await Promise.all([
      base44.entities.Chamado.list("-created_date", 500),
      base44.entities.Colaborador.list("nome", 500),
    ]);
    setItems(c); setColaboradores(col);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const colEmail = (id) => colaboradores.find((c) => c.id === id)?.email;

  const filtered = useMemo(() => items.filter((i) => statusFilter === "todos" || i.status === statusFilter), [items, statusFilter]);

  const responder = async () => {
    if (!resp.record) return;
    let usuario_email = null;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
    await base44.entities.Chamado.update(resp.record.id, {
      status: "resolvido", respondido_por: usuario_email, resposta: resp.texto, resolvido_em: new Date().toISOString(),
    });
    const email = colEmail(resp.record.colaborador_id);
    if (email) {
      await notificar({
        destinatario_email: email, tipo: "chamado", titulo: `Chamado resolvido: ${resp.record.titulo}`,
        mensagem: resp.texto || "", link: "/pwa/chamados", origem_tipo: "Chamado", origem_id: resp.record.id,
      });
    }
    setResp({ open: false, record: null, texto: "" });
    load();
  };

  const mudarStatus = async (c, status) => {
    await base44.entities.Chamado.update(c.id, { status });
    load();
  };

  return (
    <PageShell title="Chamados" description="Chamados abertos pelos colaboradores via PWA.">
      <Card className="p-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Data</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Fotos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem chamados.</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">{c.created_date ? format(new Date(c.created_date), "dd/MM HH:mm") : "—"}</TableCell>
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell>{colNome(c.colaborador_id)}</TableCell>
                <TableCell><span className="text-xs uppercase text-muted-foreground">{c.categoria}</span></TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${PRIO_COLOR[c.prioridade] || ""}`}>{c.prioridade}</Badge></TableCell>
                <TableCell>
                  {(c.fotos || []).length > 0 ? (
                    <a href={c.fotos[0]} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {c.fotos.length}
                    </a>
                  ) : "—"}
                </TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_COLOR[c.status] || ""}`}>{c.status}</Badge></TableCell>
                <TableCell>
                  {c.status === "aberto" && <Button variant="outline" size="sm" onClick={() => mudarStatus(c, "em_atendimento")}>Atender</Button>}
                  {c.status !== "resolvido" && c.status !== "cancelado" && (
                    <Button variant="ghost" size="sm" onClick={() => setResp({ open: true, record: c, texto: "" })}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Resolver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={resp.open} onOpenChange={(o) => !o && setResp({ open: false, record: null, texto: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver chamado</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium">{resp.record?.titulo}</div>
            <Textarea rows={4} placeholder="Resposta / solução aplicada..." value={resp.texto} onChange={(e) => setResp((r) => ({ ...r, texto: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResp({ open: false, record: null, texto: "" })}>Cancelar</Button>
            <Button onClick={responder}>Marcar resolvido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}