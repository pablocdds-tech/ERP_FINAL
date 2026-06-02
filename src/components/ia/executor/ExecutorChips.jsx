import { Receipt, UserPlus, FileText, Tag, Search, BarChart3, ShoppingCart, ScanLine } from "lucide-react";

const CHIPS = [
  { label: "Lançar cupom", icon: Receipt, prompt: "Quero lançar um cupom fiscal no financeiro. Vou anexar a foto." },
  { label: "Analisar comprovante", icon: ScanLine, prompt: "Analise este comprovante e me diga o que é." },
  { label: "Cadastrar fornecedor", icon: UserPlus, prompt: "Cadastrar fornecedor " },
  { label: "Criar conta a pagar", icon: FileText, prompt: "Criar uma conta a pagar de R$ " },
  { label: "Classificar despesa", icon: Tag, prompt: "Classificar esta despesa: " },
  { label: "Consultar financeiro", icon: Search, prompt: "Consultar contas a pagar em aberto" },
  { label: "Lançar compra", icon: ShoppingCart, prompt: "Lançar uma compra para a loja NB: " },
  { label: "Gerar relatório", icon: BarChart3, prompt: "Gerar um relatório de " },
];

export default function ExecutorChips({ onPick, disabled }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {CHIPS.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(c.prompt)}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[12px] px-3 py-1.5 rounded-full bg-card border border-border text-foreground/80 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors disabled:opacity-50"
          >
            <Icon className="w-3.5 h-3.5" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}