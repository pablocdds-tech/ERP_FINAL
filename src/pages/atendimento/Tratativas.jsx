import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Gift, Undo2, User, Clock } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import StatusBadge from "@/components/atendimento/StatusBadge";
import { motivoLabel } from "@/lib/atendimento-config";
import { resolverReclamacao, criarCortesiaDeReclamacao, criarReembolsoDeReclamacao } from "@/lib/atendimento-service";
import { useAuth } from "@/lib/AuthContext";

export default function Tratativas() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [resolverDlg, setResolverDlg] = useState({ open: false, item: null, solucao: "", responsavel: "" });
  const [cortesiaDlg, setCortesiaDlg] = useState({ open: false, item: null, valor: 0, descricao: "" });
  const [reembolsoDlg, setReembolsoDlg] = useState({ open: false, item: null, valor: 0, motivo: "" });

  const load = async () => {
    const all = await base44.entities.Reclamacao.list("-data");
    setItems(all.filter((r) => ["aberta", "em_tratativa", "aguardando_cliente"].includes(r.status_tratativa)));
  };
  useEffect(() => { load(); }, []);

  const horasAberto = (r) => {
    const ref = new Date(r.created_date || r.data);
    return differenceInHours(new Date(), ref);
  };

  const confirmarResolver = async () => {
    await resolverReclamacao(resolverDlg.item, resolverDlg.solucao, resolverDlg.responsavel || user?.email);
    setResolverDlg({ open: false, item: null, solucao: "", responsavel: "" });
    load();
  };

  const confirmarCortesia = async () => {
    await criarCortesiaDeReclamacao(cortesiaDlg.item, {
      valor_estimado: cortesiaDlg.valor,
      descricao: cortesiaDlg.descricao,
      autorizado_por: user?.email,
    });
    setCortesiaDlg({ open: false, item: null, valor: 0, descricao: "" });
    load();
  };

  const confirmarReembolso = async () => {
    await criarReembolsoDeReclamacao(reembolsoDlg.item, {
      valor: reembolsoDlg.valor,
      motivo: reembolsoDlg.motivo,
      autorizado_por: user?.email,
    });
    setReembolsoDlg({ open: false, item: null, valor: 0, motivo: "" });
    load();
  };

  return (
    <PageShell title="Tratativas em andamento" description="Reclamações que ainda não foram resolvidas — agir aqui.">
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma tratativa pendente. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const horas = horasAberto(r);
            const atrasada = horas > 24;
            return (
              <Card key={r.id} className={`p-4 ${atrasada ? "border-red-300" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium">{r.titulo}</div>
                      <StatusBadge status={r.status_tratativa} />
                      <span className={`inline-flex items-center gap-1 text-xs ${atrasada ? "text-red-600" : "text-muted-foreground"}`}>
                        <Clock className="w-3 h-3" /> {horas}h aberto
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.data && format(new Date(r.data), "dd/MM/yy")} • Motivo: {motivoLabel(r.motivo)} • Severidade: {r.severidade}
                    </div>
                    {r.descricao && <div className="text-sm mt-2 text-muted-foreground line-clamp-2">{r.descricao}</div>}
                    <div className="text-xs mt-2 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {r.cliente_nome || "—"}</span>
                      {r.cliente_telefone && <span>📞 {r.cliente_telefone}</span>}
                      {r.responsavel_tratativa && <span>👤 Resp: {r.responsavel_tratativa}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => setResolverDlg({ open: true, item: r, solucao: "", responsavel: r.responsavel_tratativa || user?.email || "" })}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCortesiaDlg({ open: true, item: r, valor: 0, descricao: `Cortesia: ${r.titulo}` })}>
                      <Gift className="w-3 h-3 mr-1" /> Cortesia
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReembolsoDlg({ open: true, item: r, valor: r.valor_pedido || 0, motivo: r.titulo })}>
                      <Undo2 className="w-3 h-3 mr-1" /> Reembolso
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolver */}
      <Dialog open={resolverDlg.open} onOpenChange={(o) => setResolverDlg((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como resolvida</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1">Responsável</div>
              <Input value={resolverDlg.responsavel} onChange={(e) => setResolverDlg((d) => ({ ...d, responsavel: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs mb-1">Solução aplicada</div>
              <Textarea rows={3} value={resolverDlg.solucao} onChange={(e) => setResolverDlg((d) => ({ ...d, solucao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverDlg({ open: false, item: null, solucao: "", responsavel: "" })}>Cancelar</Button>
            <Button onClick={confirmarResolver}>Resolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cortesia */}
      <Dialog open={cortesiaDlg.open} onOpenChange={(o) => setCortesiaDlg((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conceder cortesia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1">Valor estimado (R$)</div>
              <Input type="number" step="0.01" value={cortesiaDlg.valor} onChange={(e) => setCortesiaDlg((d) => ({ ...d, valor: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <div className="text-xs mb-1">Descrição</div>
              <Textarea rows={2} value={cortesiaDlg.descricao} onChange={(e) => setCortesiaDlg((d) => ({ ...d, descricao: e.target.value }))} />
            </div>
            <p className="text-xs text-amber-600">⚠️ Será gerado alerta para o financeiro.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCortesiaDlg({ open: false, item: null, valor: 0, descricao: "" })}>Cancelar</Button>
            <Button onClick={confirmarCortesia}>Conceder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reembolso */}
      <Dialog open={reembolsoDlg.open} onOpenChange={(o) => setReembolsoDlg((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar reembolso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1">Valor (R$)</div>
              <Input type="number" step="0.01" value={reembolsoDlg.valor} onChange={(e) => setReembolsoDlg((d) => ({ ...d, valor: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <div className="text-xs mb-1">Motivo</div>
              <Textarea rows={2} value={reembolsoDlg.motivo} onChange={(e) => setReembolsoDlg((d) => ({ ...d, motivo: e.target.value }))} />
            </div>
            <p className="text-xs text-amber-600">⚠️ Será gerado alerta para o financeiro.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReembolsoDlg({ open: false, item: null, valor: 0, motivo: "" })}>Cancelar</Button>
            <Button onClick={confirmarReembolso}>Solicitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}