import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mesasService, fmtMoeda, ehPizza } from "@/lib/mesas-service";
import { useMesas } from "@/lib/MesasContext";
import { Search, ArrowLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import PizzaDialog from "@/components/mesas/PizzaDialog";
import ProdutoLinha from "@/components/mesas/ProdutoLinha";

// Tela de produtos: categorias grandes → lista de produtos com botão +.
export default function Produtos() {
  const { comandaId } = useParams();
  const navigate = useNavigate();
  const { lojaId, config } = useMesas() || {};
  const [comanda, setComanda] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catAtiva, setCatAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [pizzaProduto, setPizzaProduto] = useState(null);

  const carregar = useCallback(async () => {
    const c = await mesasService.getComanda(comandaId);
    const prods = await mesasService.listProdutos(lojaId);
    const cats = [...new Set(prods.map((p) => p.categoria).filter(Boolean))].sort();
    setComanda(c);
    setProdutos(prods);
    setCategorias(cats);
    setLoading(false);
  }, [comandaId, lojaId]);

  useEffect(() => { setLoading(true); carregar(); }, [carregar]);

  const adicionarSimples = async (produto, quantidade = 1) => {
    await mesasService.adicionarItem({ comanda, produto, quantidade, opcoes: [] });
    toast({ title: "Adicionado", description: `${quantidade}× ${produto.nome}` });
  };

  const filtrados = produtos.filter((p) => {
    if (busca) return (p.nome || "").toLowerCase().includes(busca.toLowerCase());
    if (catAtiva) return p.categoria === catAtiva;
    return false;
  });

  if (loading || !comanda) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-24">
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">
          M: {comanda.mesa_numero} · C: {comanda.codigo}
        </span>
        <div className="ml-auto relative w-40">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="h-9 pl-8 bg-slate-50" />
        </div>
      </div>

      <div className="px-4 py-4">
        {!catAtiva && !busca ? (
          // Grade de categorias
          <div className="grid grid-cols-2 gap-3">
            {categorias.length === 0 && (
              <div className="col-span-2 text-center py-10 text-slate-400 text-sm">Nenhum produto ativo cadastrado.</div>
            )}
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatAtiva(cat)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm py-6 px-3 font-semibold text-slate-800 flex items-center justify-between active:scale-[0.98]"
              >
                <span className="truncate">{cat}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <>
            {!busca && (
              <button onClick={() => setCatAtiva(null)} className="flex items-center gap-1 text-sm text-blue-600 font-medium mb-3">
                <ArrowLeft className="w-4 h-4" /> Categorias
              </button>
            )}
            <div className="space-y-2.5">
              {filtrados.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Nenhum produto encontrado.</div>}
              {filtrados.map((p) => (
                <ProdutoLinha
                  key={p.id}
                  produto={p}
                  onAdicionar={adicionarSimples}
                  onAbrirPizza={setPizzaProduto}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 max-w-2xl mx-auto flex gap-2">
        <button onClick={() => navigate(`/mesas/comanda/${comandaId}`)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-semibold active:scale-[0.99]">
          Cancelar
        </button>
        <button onClick={() => navigate(`/mesas/comanda/${comandaId}`)} className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold active:scale-[0.99]">
          Ver resumo
        </button>
      </div>

      {pizzaProduto && (
        <PizzaDialog
          produto={pizzaProduto}
          comanda={comanda}
          lojaId={lojaId}
          config={config}
          onClose={() => setPizzaProduto(null)}
          onConfirmado={() => { setPizzaProduto(null); toast({ title: "Pizza adicionada", description: pizzaProduto.nome }); }}
        />
      )}
    </div>
  );
}