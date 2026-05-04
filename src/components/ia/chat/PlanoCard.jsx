import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Loader2, ShieldAlert, Ban, AlertTriangle, Sparkles, FileText } from "lucide-react";

const STATUS_CFG = {
  aguardando_confirmacao: { label: "Aguardando confirmação", icon: Sparkles, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  executado: { label: "Executado", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rascunho_criado: { label: "Rascunho", icon: FileText, tone: "bg-slate-50 text-slate-700 border-slate-200" },
  pendente_revisao: { label: "Pendente de revisão", icon: AlertTriangle, tone: "bg-orange-50 text-orange-700 border-orange-200" },
  aguardando_aprovacao: { label: "Aguardando aprovação", icon: ShieldAlert, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  rejeitado: { label: "Rejeitado", icon: Ban, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  erro: { label: "Erro", icon: AlertTriangle, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelado: { label: "Cancelado", icon: X, tone: "bg-slate-50 text-slate-600 border-slate-200" },
};

function formatBRL(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlanoCard({ comando, onConfirmar, onCancelar, loading }) {
  const cfg = STATUS_CFG[comando.status] || STATUS_CFG.aguardando_confirmacao;
  const Icon = cfg.icon;
  const dados = (() => { try { return JSON.parse(comando.plano_dados || "{}"); } catch { return {}; } })();
  const criados = (() => { try { return JSON.parse(comando.registros_criados || "[]"); } catch { return []; } })();

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
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
          {comando.motivo_aprovacao}
        </div>
      )}

      {comando.erro_detalhe && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-2">
          {comando.erro_detalhe}
        </div>
      )}

      {/* Resumo de campos genéricos */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
        {dados.descricao && <div className="col-span-2"><span className="font-medium text-foreground">Descrição:</span> {dados.descricao}</div>}
        {dados.fornecedor_nome && <div><span className="font-medium text-foreground">Fornecedor:</span> {dados.fornecedor_nome}</div>}
        {dados.cliente_nome && <div><span className="font-medium text-foreground">Cliente:</span> {dados.cliente_nome}</div>}
        {dados.loja_nome && <div><span className="font-medium text-foreground">Loja:</span> {dados.loja_nome}</div>}
        {dados.categoria_nome && <div><span className="font-medium text-foreground">Categoria:</span> {dados.categoria_nome}</div>}
        {typeof dados.valor === "number" && <div><span className="font-medium text-foreground">Valor:</span> {formatBRL(dados.valor)}</div>}
        {dados.vencimento_iso && <div><span className="font-medium text-foreground">Vencimento:</span> {dados.vencimento_iso}</div>}
      </div>

      {/* Lista de itens em lote */}
      {Array.isArray(dados.itens) && dados.itens.length > 0 && (
        <div className="mt-2 mb-2">
          <div className="text-[11px] font-medium text-foreground mb-1">Itens ({dados.itens.length}):</div>
          <ol className="text-[11px] space-y-0.5 list-decimal pl-4">
            {dados.itens.map((it, i) => (
              <li key={i}>
                <span className="font-medium">{it.nome}</span>
                {it.tipo_detalhado && <span className="text-muted-foreground"> — {it.tipo_detalhado.replace(/_/g, " ")}</span>}
                {it.categoria && <span className="text-muted-foreground"> — {it.categoria}</span>}
                {it.unidade_medida && <span className="text-muted-foreground"> ({it.unidade_medida})</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Lista de parcelas */}
      {Array.isArray(dados.parcelas) && dados.parcelas.length > 0 && (
        <div className="mt-2 mb-2">
          <div className="text-[11px] font-medium text-foreground mb-1">Parcelas ({dados.parcelas.length}):</div>
          <ol className="text-[11px] space-y-0.5 list-decimal pl-4">
            {dados.parcelas.map((p, i) => (
              <li key={i}>{p.numero ? `#${p.numero}` : ""} {formatBRL(p.valor)} — venc. {p.vencimento_iso}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Registros criados após execução */}
      {criados.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-medium text-emerald-700 mb-1">Criados:</div>
          <ul className="text-[11px] space-y-0.5 pl-4 list-disc text-emerald-700">
            {criados.map((c, i) => (
              <li key={i}>{c.entidade}: {c.descricao}</li>
            ))}
          </ul>
        </div>
      )}

      {comando.status === "aguardando_confirmacao" && (
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onCancelar} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={onConfirmar} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
            Confirmar e executar
          </Button>
        </div>
      )}
    </Card>
  );
}