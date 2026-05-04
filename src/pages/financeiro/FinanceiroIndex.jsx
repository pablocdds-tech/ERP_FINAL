import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { FINANCEIRO_REAL_LIST, FINANCEIRO_VIRTUAL_LIST } from "@/lib/financeiro-config";

function CardLink({ item, prefix }) {
  const Icon = item.icon;
  return (
    <Link to={`/admin/financeiro/${prefix}/${item.slug}`}>
      <Card className="p-5 h-full hover:border-foreground/30 transition-colors group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descricao}</div>
            <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>Abrir</span>
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function FinanceiroIndex() {
  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Financeiro Real (banco de verdade) é mantido SEPARADO do Banco Virtual interno (CD ↔ lojas)."
      />

      <div className="mb-3 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
        <h2 className="text-sm font-semibold tracking-tight">Financeiro Real</h2>
        <span className="text-xs text-muted-foreground">— banco, contas a pagar/receber, fluxo</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {FINANCEIRO_REAL_LIST.map((c) => <CardLink key={c.slug} item={c} prefix="real" />)}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
        <h2 className="text-sm font-semibold tracking-tight">Banco Virtual</h2>
        <span className="text-xs text-muted-foreground">— contas internas entre CD e lojas</span>
      </div>
      <Card className="p-3 mb-3 bg-amber-50/50 border-amber-200/70">
        <div className="flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Não é banco de verdade.</strong> Lançamentos internos NÃO inflam receita real, NÃO movimentam contas bancárias e NÃO entram no fluxo de caixa real.
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FINANCEIRO_VIRTUAL_LIST.map((c) => <CardLink key={c.slug} item={c} prefix="virtual" />)}
      </div>
    </div>
  );
}