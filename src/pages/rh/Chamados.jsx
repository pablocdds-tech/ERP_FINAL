import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { format } from "date-fns";

const STATUS_CLS = {
  aberto: "bg-amber-50 text-amber-700 border-amber-200",
  em_atendimento: "bg-blue-50 text-blue-700 border-blue-200",
  resolvido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Chamados() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [statusF, setStatusF] = useState("todos");
  const [view, setView] = useState({ open: false, ch: null, resposta: "", novoStatus: "em_atendimento" });

  const load = async () => {
    const [c, co] = await Promise.all([
      base44.entities.Chamado.list("-created_date", 500),
      base44.entities.Colaborador.list(),
    ]);
    setItems(c); setColaboradores(co);
  };
  useEffect(() => { load(); }, []);
  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const filtered = items.filter((c) => statusF === "todos" || c.status === statusF);

  const responder = async () => {
    let usuario_email = null;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
    const updates = {
      respondido_por: usuario_email,
      resposta: view.resposta,
      status: view.novoStatus,
    };
    if (view.novoStatus === "resolvido") updates.resolvido_em = new Date().toISOString();
    await base44.entities.Chamado.update(view.ch.id, updates);
    // notifica autor
    const aut = colaboradores.find((c) => c.id === view.ch.colaborador_id);
    if (aut?.email) {
      await base44.entities.Notificacao.create({
        destinatario_email: aut.email, tipo: "chamado",
        titulo: `Chamado atualizado: ${view.ch.titulo}`,
        mensagem: view.resposta || `Status: ${view.novoStatus}`,
        link: "/pwa/chamados", origem_tipo: "Chamado", origem_id: view.ch.id,
      });
    }
    setView({ open: false, ch: null, resposta: "", novoStatus: "em_atendimento" });
    load();
  };

  return (
    <PageShell title="Chamados" description="Chamados abertos pelos colaboradores via PWA.">
      <Card className="p-4 mb-4">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem><SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem><SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead>Autor</TableHead>
            <TableHead>Categoria</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem chamados.</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{format(new Date(c.created_date), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell>{colNome(c.colaborador_id)}</TableCell>
                <TableCell className="text-xs">{c.categoria}</TableCell>
                <TableCell className="text-xs">{c.prioridade}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_CLS[c.status]}`}>{c.status}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView({ open: true, ch: c, resposta: c.resposta || "", novoStatus: c.status === "aberto" ? "em_atendimento" : c.status })}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={view.open} onOpenChange={(o) => !o && setView({ open: false, ch: null, resposta: "", novoStatus: "em_atendimento" })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view.ch?.titulo}</DialogTitle></DialogHeader>
          {view.ch && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">{colNome(view.ch.colaborador_id)} • {view.ch.categoria} • {view.ch.prioridade}</div>
              <div className="text-sm">{view.ch.descricao || "—"}</div>
              {(view.ch.fotos || []).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {view.ch.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noreferrer">
                      <img src={f} alt="" className="w-full h-24 object-cover rounded border border-border" />
                    </a>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="text-xs font-medium">Resposta / Atualização</div>
                <Textarea rows={3} value={view.resposta} onChange={(e) => setView({ ...view, resposta: e.target.value })} placeholder="Escreva uma resposta..." />
                <Select value={view.novoStatus} onValueChange={(v) => setView({ ...view, novoStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="cancelado">Cancelar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setView({ open: false, ch: null, resposta: "", novoStatus: "em_atendimento" })}>Fechar</Button>
            <Button onClick={responder}><MessageSquare className="w-4 h-4 mr-1.5" />Atualizar chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}