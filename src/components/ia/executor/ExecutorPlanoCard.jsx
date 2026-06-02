import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, X, Loader2, ShieldAlert, Ban, AlertTriangle, Sparkles, FileText, Pencil, ShieldCheck,
} from "lucide-react";

const STATUS_CFG = {
  aguardando_confirmacao: { label: "Aguardando confirmação", icon: Sparkles, tone: "border-amber-200", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  executado: { label: "Executado", icon: CheckCircle2, tone: "border-emerald-200", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rascunho_criado: { label: "Rascunho criado", icon: FileText, tone: "border-slate-200", chip: "bg-slate-50 text-slate-700 border-slate-200" },
  pendente_revisao: { label: "Precisa de mais informações", icon: AlertTriangle, tone: "border-orange-200", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  aguardando_aprovacao: { label: "Aguardando aprovação", icon: ShieldAlert, tone: "border-violet-200", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  rejeitado: { label: "Não permitido", icon: Ban, tone: "border-rose-200", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  erro: { label: "Erro", icon: AlertTriangle, tone: "border-rose-200", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelado: { label: "Cancelado", icon: X, tone: "border-slate-200", chip: "bg-slate-50 text-slate-600 border-slate-200" },
};

const TIPO_DOC_LABEL = {
  cupom_fiscal: "Cupom fiscal", nota_fiscal: "Nota fiscal", recibo: "Recibo",
  boleto: "Boleto", comprovante_pagamento: "Comprovante", orcamento: "Orçamento", nao_identificado: "Não identificado",
};

function formatBRL(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Campo({ label, value, sugestao }) {
  const vazio = value === undefined || value === null || value === "";
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-dashed border-border/60 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}{sugestao && !vazio ? " (sugerido)" : ""}</span>
      <span className={`text-[12px] text-right font-medium ${vazio ? "text-orange-500 italic font-normal" : "text-foreground"}`}>
        {vazio ? "não identificado" : value}
      </span>
    </div>
  );
}

// Card de ação proposta. Mostra dados extraídos, pendências, impacto e ações.
export default function ExecutorPlanoCard({ comando, loading, onConfirmar, onEditar, onCancelar }) {
  const cfg = STATUS_CFG[comando.status] || STATUS_CFG.aguardando_confirmacao;
  const Icon = cfg.icon;
  const parsed = (() => { try { return JSON.parse(comando.plano_dados || "{}"); } catch { return {}; } })();
  const meta = parsed._meta || {};
  const dados = { ...parsed }; delete dados._meta;
  const criados = (() => { try { return JSON.parse(comando.registros_criados || "[]"); } catch { return []; } })();

  const ehDocumento = !!meta.tipo_documento && meta.tipo_documento !== "nao_identificado";
  const ehFinanceiro = ["criar_conta_pagar", "criar_conta_receber", "criar_compra", "criar_compra_com_itens", "gerar_conta_pagar_compra"].includes(comando.intencao);
  const pendentes = [...(meta.campos_ausentes || []), ...(meta.campos_incertos || [])];
  const podeAgir = comando.status === "aguardando_confirmacao";
  const sugestao = ehDocumento;

  return (
    <Card className={`p-3.5 border ${cfg.tone} bg-card max-w-[92%]`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.chip}`}>
          <Icon className="w-3 h-3" /> {cfg.label}
        </div>
        <Badge variant="outline" className="text-[10px]">{comando.intencao?.replace(/_/g, " ")}</Badge>
      </div>

      {/* Título / resumo */}
      <div className="text-sm text-foreground font-semibold mb-2">{comando.plano_resumo}</div>

      {meta.tipo_documento && (
        <div className="text-[11px] text-muted-foreground mb-2">
          Documento: <span className="font-medium text-foreground">{TIPO_DOC_LABEL[meta.tipo_documento] || meta.tipo_documento}</span>
        </div>
      )}

      {/* Aviso (rascunho, ilegível, aprovação, etc.) */}
      {comando.motivo_aprovacao && (
        <div className={`text-[11px] rounded-md p-2 mb-2 border ${cfg.chip}`}>{comando.motivo_aprovacao}</div>
      )}
      {comando.erro_detalhe && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2 mb-2">{comando.erro_detalhe}</div>
      )}

      {/* Dados extraídos (financeiro/documento) */}
      {(ehDocumento || ehFinanceiro) && (
        <div className="rounded-lg bg-muted/40 px-2.5 py-1.5 mb-2">
          <Campo label="Fornecedor" value={dados.fornecedor_nome} sugestao={sugestao} />
          {dados.cliente_nome && <Campo label="Cliente" value={dados.cliente_nome} />}
          <Campo label="Valor total" value={typeof dados.valor === "number" ? formatBRL(dados.valor) : (dados.compra_valor_total ? formatBRL(dados.compra_valor_total) : "")} />
          <Campo label="Loja" value={dados.loja_nome} sugestao={sugestao} />
          <Campo label="Categoria" value={dados.categoria_nome} sugestao={sugestao} />
          <Campo label="Forma de pagamento" value={dados.forma_pagamento} />
          <Campo label="Data" value={dados.data_documento_iso || dados.compra_data_iso} />
          <Campo label="Vencimento" value={dados.vencimento_iso || dados.compra_vencimento_iso} />
        </div>
      )}

      {/* Itens */}
      {Array.isArray(dados.itens) && dados.itens.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] font-medium text-foreground mb-1">Itens identificados ({dados.itens.length}):</div>
          <ul className="text-[11px] space-y-0.5 list-disc pl-4 text-muted-foreground">
            {dados.itens.map((it, i) => (
              <li key={i}>
                <span className="text-foreground">{it.nome}</span>
                {it.quantidade ? ` — ${it.quantidade}${it.unidade_medida ? " " + it.unidade_medida : ""}` : ""}
                {it.tipo_detalhado ? ` (${it.tipo_detalhado.replace(/_/g, " ")})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parcelas */}
      {Array.isArray(dados.parcelas) && dados.parcelas.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] font-medium text-foreground mb-1">Parcelas ({dados.parcelas.length}):</div>
          <ol className="text-[11px] space-y-0.5 list-decimal pl-4 text-muted-foreground">
            {dados.parcelas.map((p, i) => <li key={i}>{p.numero ? `#${p.numero} ` : ""}{formatBRL(p.valor)} — venc. {p.vencimento_iso}</li>)}
          </ol>
        </div>
      )}

      {/* Campos que precisam de confirmação */}
      {pendentes.length > 0 && podeAgir && (
        <div className="mb-2 text-[11px]">
          <div className="font-medium text-orange-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Precisa confirmar:</div>
          <div className="flex flex-wrap gap-1">
            {pendentes.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Impacto */}
      {podeAgir && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2 mb-2 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{ehFinanceiro
            ? "Será criado um lançamento em rascunho/aberto. Não baixa pagamento e não altera saldo bancário nem Banco Virtual."
            : "Será criado/atualizado o registro indicado. Nenhuma ação financeira sensível é executada."}</span>
        </div>
      )}

      {/* Registros criados */}
      {criados.length > 0 && (
        <div className="mb-1">
          <div className="text-[11px] font-medium text-emerald-700 mb-1">Criado no ERP:</div>
          <ul className="text-[11px] space-y-0.5 pl-4 list-disc text-emerald-700">
            {criados.map((c, i) => <li key={i}>{c.entidade}: {c.descricao}</li>)}
          </ul>
        </div>
      )}

      {/* Ações */}
      {podeAgir && (
        <div className="flex flex-wrap justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onCancelar} disabled={loading}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
          <Button variant="outline" size="sm" onClick={onEditar} disabled={loading}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={onConfirmar} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
            Confirmar execução
          </Button>
        </div>
      )}
    </Card>
  );
}