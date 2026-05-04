import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Receipt, ShoppingCart, FileText, CheckSquare, AlertTriangle, ClipboardList, Users, Wallet, Banknote, FileWarning } from "lucide-react";

const ACOES = [
  { l: "Lançar fechamento", icon: Receipt, to: "/admin/vendas/fechamentos" },
  { l: "Lançar compra", icon: ShoppingCart, to: "/admin/operacoes/compras" },
  { l: "Contas a pagar", icon: Wallet, to: "/admin/financeiro/real/contas-pagar" },
  { l: "Contas a receber", icon: Banknote, to: "/admin/financeiro/real/contas-receber" },
  { l: "Movimentações", icon: Banknote, to: "/admin/financeiro/real/movimentacoes" },
  { l: "Notas pendentes", icon: FileWarning, to: "/admin/operacoes/notas-fiscais" },
  { l: "Estoque crítico", icon: AlertTriangle, to: "/admin/operacoes/estoque" },
  { l: "Abrir chamado", icon: FileText, to: "/admin/rotinas/chamados" },
  { l: "Checklists", icon: CheckSquare, to: "/admin/rotinas/checklists" },
  { l: "Ponto / RH", icon: Users, to: "/admin/pessoas/ponto" },
  { l: "Sócio x Empresa", icon: ClipboardList, to: "/admin/financeiro/real/pf-pj" },
];

export default function AcoesRapidas() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Ações rápidas</h2>
      <div className="flex flex-wrap gap-2">
        {ACOES.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.l} to={a.to}>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Icon className="w-3.5 h-3.5 mr-1.5" /> {a.l}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}