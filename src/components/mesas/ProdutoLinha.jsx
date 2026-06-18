import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { fmtMoeda, ehPizza } from "@/lib/mesas-service";

// Linha de produto na lista. Para produtos simples mostra seletor de quantidade
// (− / +) e adiciona tudo de uma vez. Pizzas continuam abrindo o diálogo de borda/sabor.
export default function ProdutoLinha({ produto, onAdicionar, onAbrirPizza }) {
  const [qtd, setQtd] = useState(1);
  const pizza = ehPizza(produto);

  const adicionar = () => {
    onAdicionar(produto, qtd);
    setQtd(1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm truncate">{produto.nome}</div>
        <div className="text-xs text-slate-500">
          {fmtMoeda(produto.preco_venda)}{pizza && " · escolher borda/sabor"}
        </div>
      </div>

      {pizza ? (
        <button
          onClick={() => onAbrirPizza(produto)}
          className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center active:scale-90 shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 rounded-xl">
            <button
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="w-9 h-10 flex items-center justify-center text-slate-600 active:scale-90 disabled:opacity-40"
              disabled={qtd <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-7 text-center font-semibold text-slate-800 text-sm">{qtd}</span>
            <button
              onClick={() => setQtd((q) => q + 1)}
              className="w-9 h-10 flex items-center justify-center text-slate-600 active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={adicionar}
            className="h-10 px-3 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center active:scale-90"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}