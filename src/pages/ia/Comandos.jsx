import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ShieldAlert, AlertTriangle, Ban, X, Sparkles, Loader2, RefreshCw, FileText } from "lucide-react";
import PageShell from "@/components/ia/PageShell";
import { base44 } from "@/api/base44Client";
import { confirmarComando, cancelarComando } from "@/lib/executor-comando-service";
import { toast } from "sonner";

const STATUS_BADGE = {
  aguardando_confirmacao: { label: "Aguardando confirmação", icon: Sparkles, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  executado: { label: "Executado", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rascunho_criado: { label: "Rascunho", icon: FileText, tone: "bg-slate-50 text-slate-700 border-slate-200" },
  pendente_revisao: { label: "Pendente de revisão", icon: AlertTriangle, tone: "bg-orange-50 text-orange-700 border-orange-200" },
  aguardando_aprovacao: { label: "Aguardando aprovação", icon: ShieldAlert, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  rejeitado: { label: "Rejeitado", icon: Ban, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  erro: { label: "Erro", icon: AlertTriangle, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelado: { label: "Cancelado", icon: X, tone: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function Comandos() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acaoLoading, setAcaoLoading] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const location = useLocation();
  const focusId = new URLSearchParams(location.search).get("focus");

  const carregar = async () => {
    setLoading(true);
    const data = await base44.entities.ComandoExecutor.list("-created_date", 200).catch(() => []);
    setLista(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const fazerAcao = async (fn, id, msg) => {
    setAcaoLoading(id);
    try {
      await fn({ comandoId: id });
      toast.success(msg);
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Falha");
    } finally {
      setAcaoLoading(null);
    }
  };

  const filtrada = lista.filter((c) => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
    if (busca && !`${c.comando_original} ${c.plano_resumo} ${c.usuario_email}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell
      title="Executor ERP"
      description="Comandos em linguagem natural para cadastros, lançamentos financeiros, estoque e compras. Cada comando gera um plano que precisa ser confirmado antes da execução."
      actions={
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      }
    >
      <div className="flex gap-2 mb-3 flex-wrap">
        <Input className="max-w-xs" placeholder="Buscar comando, usuário..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_BADGE).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground self-center">{filtrada.length} de {lista.length}</div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Comando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Intenção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando...</TableCell></TableRow>
              )}
              {!loading && filtrada.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum comando registrado.</TableCell></TableRow>
              )}
              {filtrada.map((c) => {
                const cfg = STATUS_BADGE[c.status] || STATUS_BADGE.erro;
                const Icon = cfg.icon;
                const isFocus = focusId === c.id;
                return (
                  <TableRow key={c.id} className={isFocus ? "bg-amber-50/40" : ""}>
                    <TableCell className="max-w-xs">
                      <div className="text-sm font-medium line-clamp-2">{c.comando_original}</div>
                      {c.plano_resumo && <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{c.plano_resumo}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(c.created_date).toLocaleString("pt-BR")} • {c.modulo_afetado}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{c.usuario_email || "—"}</div>
                      <Badge variant="outline" className="mt-1 text-[10px]">{c.perfil_usuario || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.intencao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${cfg.tone} text-[11px]`}>
                        <Icon className="w-3 h-3 mr-1" />{cfg.label}
                      </Badge>
                      {c.exige_aprovacao && c.motivo_aprovacao && (
                        <div className="text-[10px] text-violet-700 mt-1 line-clamp-2">{c.motivo_aprovacao}</div>
                      )}
                      {c.erro_detalhe && (
                        <div className="text-[10px] text-rose-700 mt-1 line-clamp-2">{c.erro_detalhe}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.registro_entidade ? (
                        <div>
                          <div>{c.registro_entidade}</div>
                          {c.registro_id && <div className="text-[10px] text-muted-foreground">{c.registro_id.slice(0, 8)}…</div>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {c.status === "aguardando_confirmacao" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => fazerAcao(cancelarComando, c.id, "Cancelado")} disabled={acaoLoading === c.id}>Cancelar</Button>
                            <Button size="sm" onClick={() => fazerAcao(confirmarComando, c.id, "Executado")} disabled={acaoLoading === c.id}>
                              {acaoLoading === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Executar"}
                            </Button>
                          </>
                        )}

                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}