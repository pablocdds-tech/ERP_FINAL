import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Wrench, ClipboardList } from "lucide-react";
import PageShell from "@/components/rotinas/PageShell";
import ComentariosTimeline from "@/components/rotinas/ComentariosTimeline";
import { format } from "date-fns";
import { chamadoParaTarefa, chamadoParaOS } from "@/lib/rotinas-service";

const STATUS_CLS = {
  aberto: "bg-amber-50 text-amber-700 border-amber-200",
  em_atendimento: "bg-blue-50 text-blue-700 border-blue-200",
  resolvido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Chamados() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [statusF, setStatusF] = useState("todos");
  const [view, setView] = useState({ open: false, ch: null, novoStatus: "em_atendimento" });
  const [transform, setTransform] = useState({ tipo: null, responsavel_id: "", prazo: "", equipamento_id: "", fornecedor_id: "", custo_previsto: "" });

  const load = async () => {
    const [c, co, e, f] = await Promise.all([
      base44.entities.Chamado.list("-created_date", 500),
      base44.entities.Colaborador.list(),
      base44.entities.Equipamento.list(),
      base44.entities.Fornecedor.filter({ ativo: true }),
    ]);
    setItems(c); setColaboradores(co); setEquipamentos(e); setFornecedores(f);
  };
  useEffect(() => { load(); }, []);
  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const filtered = items.filter((c) => statusF === "todos" || c.status === statusF);

  const abrir = (ch) => {
    setView({ open: true, ch, novoStatus: ch.status === "aberto" ? "em_atendimento" : ch.status });
    setTransform({ tipo: null, responsavel_id: "", prazo: "", equipamento_id: ch.equipamento_id || "", fornecedor_id: "", custo_previsto: "" });
  };

  const atualizarStatus = async () => {
    const updates = { status: view.novoStatus };
    if (view.novoStatus === "resolvido") updates.resolvido_em = new Date().toISOString();
    try { updates.respondido_por = (await base44.auth.me())?.email; } catch { /* */ }
    await base44.entities.Chamado.update(view.ch.id, updates);
    // notifica autor
    const aut = colaboradores.find((c) => c.id === view.ch.colaborador_id);
    if (aut?.email) {
      await base44.entities.Notificacao.create({
        destinatario_email: aut.email, tipo: "chamado",
        titulo: `Chamado atualizado: ${view.ch.titulo}`,
        mensagem: `Status: ${view.novoStatus}`,
        link: "/pwa/chamados", origem_tipo: "Chamado", origem_id: view.ch.id,
      });
    }
    setView({ open: false, ch: null, novoStatus: "em_atendimento" });
    load();
  };

  const transformarTarefa = async () => {
    if (!transform.responsavel_id) return;
    await chamadoParaTarefa({
      chamado: view.ch,
      responsavel_id: transform.responsavel_id,
      prazo: transform.prazo,
    });
    setView({ open: false, ch: null, novoStatus: "em_atendimento" });
    load();
  };

  const transformarOS = async () => {
    await chamadoParaOS({
      chamado: view.ch,
      equipamento_id: transform.equipamento_id || undefined,
      fornecedor_id: transform.fornecedor_id || undefined,
      responsavel_id: transform.responsavel_id || undefined,
      data_prevista: transform.prazo || undefined,
      custo_previsto: parseFloat(transform.custo_previsto) || 0,
    });
    setView({ open: false, ch: null, novoStatus: "em_atendimento" });
    load();
  };

  return (
    <PageShell title="Chamados" description="Chamados abertos pelos colaboradores via PWA. Transforme em tarefa ou OS.">
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
            <TableHead>Categoria</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead>
            <TableHead>Vínculos</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Sem chamados.</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="text-xs">{format(new Date(c.created_date), "dd/MM HH:mm")}</TableCell>
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell>{colNome(c.colaborador_id)}</TableCell>
                <TableCell className="text-xs">{c.categoria}</TableCell>
                <TableCell className="text-xs">{c.prioridade}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${STATUS_CLS[c.status]}`}>{c.status}</Badge></TableCell>
                <TableCell className="text-xs space-x-1">
                  {c.tarefa_id && <Badge variant="outline" className="text-[10px]">tarefa</Badge>}
                  {c.ordem_servico_id && <Badge variant="outline" className="text-[10px]">OS</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrir(c)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={view.open} onOpenChange={(o) => !o && setView({ open: false, ch: null, novoStatus: "em_atendimento" })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Status update */}
              <div className="border-t border-border pt-3 flex gap-2 items-center">
                <Select value={view.novoStatus} onValueChange={(v) => setView({ ...view, novoStatus: v })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="cancelado">Cancelar</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={atualizarStatus}>Atualizar status</Button>
              </div>

              {/* Transformar em tarefa / OS */}
              {!view.ch.tarefa_id && !view.ch.ordem_servico_id && view.ch.status !== "resolvido" && view.ch.status !== "cancelado" && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant={transform.tipo === "tarefa" ? "default" : "outline"} onClick={() => setTransform({ ...transform, tipo: transform.tipo === "tarefa" ? null : "tarefa" })}>
                      <ClipboardList className="w-3.5 h-3.5 mr-1" /> Gerar tarefa
                    </Button>
                    <Button size="sm" variant={transform.tipo === "os" ? "default" : "outline"} onClick={() => setTransform({ ...transform, tipo: transform.tipo === "os" ? null : "os" })}>
                      <Wrench className="w-3.5 h-3.5 mr-1" /> Gerar OS
                    </Button>
                  </div>

                  {transform.tipo === "tarefa" && (
                    <div className="bg-muted/30 rounded p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={transform.responsavel_id || ""} onValueChange={(v) => setTransform({ ...transform, responsavel_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                          <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="date" value={transform.prazo} onChange={(e) => setTransform({ ...transform, prazo: e.target.value })} />
                      </div>
                      <Button size="sm" onClick={transformarTarefa} disabled={!transform.responsavel_id}>Confirmar tarefa</Button>
                    </div>
                  )}

                  {transform.tipo === "os" && (
                    <div className="bg-muted/30 rounded p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={transform.equipamento_id || "__none__"} onValueChange={(v) => setTransform({ ...transform, equipamento_id: v === "__none__" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— sem equipamento —</SelectItem>
                            {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={transform.fornecedor_id || "__none__"} onValueChange={(v) => setTransform({ ...transform, fornecedor_id: v === "__none__" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— sem prestador —</SelectItem>
                            {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome_fantasia}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="date" placeholder="Previsão" value={transform.prazo} onChange={(e) => setTransform({ ...transform, prazo: e.target.value })} />
                        <Input type="number" step="0.01" placeholder="Custo previsto" value={transform.custo_previsto} onChange={(e) => setTransform({ ...transform, custo_previsto: e.target.value })} />
                      </div>
                      <Button size="sm" onClick={transformarOS}>Confirmar OS</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Comentários */}
              <ComentariosTimeline entidade="Chamado" entidade_id={view.ch.id} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setView({ open: false, ch: null, novoStatus: "em_atendimento" })}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}