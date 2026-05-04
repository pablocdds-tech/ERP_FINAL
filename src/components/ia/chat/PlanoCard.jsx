import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Loader2, ShieldAlert, Ban, AlertTriangle, Sparkles } from "lucide-react";

const STATUS_CFG = {
  aguardando_confirmacao: { label: "Aguardando confirmação", icon: Sparkles, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  executado: { label: "Executado", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  aguardando_aprovacao: { label: "Aguardando aprovação", icon: ShieldAlert, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  rejeitado: { label: "Rejeitado", icon: Ban, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  erro: { label: "Erro", icon: AlertTriangle, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelado: { label: "Cancelado", icon: X, tone: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function PlanoCard({ comando, onConfirmar, onCancelar, loading }) {
  const cfg = STATUS_CFG[comando.status] || STATUS_CFG.aguardando_confirmacao;
  const Icon = cfg.icon;
  const dados = (() => {
    try { return JSON.parse(comando.plano_dados || "{}"); } catch { return {}; }
  })();

  return (
    <Card className={`p-4 border ${cfg.tone}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Icon className="w-3.5 h-3.5" /> {cfg.label}
        </div>
        <Badge variant="outline" className="text-[10px]">{comando.intencao}</Badge>
      </div>

      <div className="text-sm text-foreground font-medium mb-2">{comando.plano_resumo}</div>

      {comando.motivo_aprovacao && (
        <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded p-2 mb-2">
          {comando.motivo_aprovacao}
        </div>
      )}

      {comando.erro_detalhe && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-2">
          {comando.erro_detalhe}
        </div>
      )}

      {Object.keys(dados).length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
          {dados.responsavel_nome && <div><span className="font-medium text-foreground">Responsável:</span> {dados.responsavel_nome}</div>}
          {dados.loja_nome && <div><span className="font-medium text-foreground">Loja:</span> {dados.loja_nome}</div>}
          {dados.prazo_iso && <div><span className="font-medium text-foreground">Prazo:</span> {dados.prazo_iso}</div>}
          {dados.prioridade && <div><span className="font-medium text-foreground">Prioridade:</span> {dados.prioridade}</div>}
          {dados.categoria && <div><span className="font-medium text-foreground">Categoria:</span> {dados.categoria}</div>}
          {dados.severidade && <div><span className="font-medium text-foreground">Severidade:</span> {dados.severidade}</div>}
        </div>
      )}

      {comando.status === "aguardando_confirmacao" && (
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={onCancelar} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirmar} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
            Confirmar e executar
          </Button>
        </div>
      )}

      {comando.status === "executado" && comando.registro_entidade && (
        <div className="text-[11px] text-emerald-700 mt-1">
          Criado em <strong>{comando.registro_entidade}</strong>{comando.registro_id ? ` (id ${comando.registro_id})` : ""}.
        </div>
      )}
    </Card>
  );
}