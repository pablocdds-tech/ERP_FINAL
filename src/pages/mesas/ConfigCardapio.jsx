import { useEffect, useState, useCallback } from "react";
import { mesasService, fmtMoeda } from "@/lib/mesas-service";
import { useMesas } from "@/lib/MesasContext";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

// Configuração de cardápio: lista todos os produtos por categoria com um
// toggle de disponibilidade. Produto indisponível (ativo = false) some do
// lançamento do garçom.
export default function ConfigCardapio() {
  const { lojaId } = useMesas() || {};
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(null);

  const carregar = useCallback(async () => {
    const prods = await mesasService.listTodosProdutos(lojaId);
    setProdutos(prods);
    setLoading(false);
  }, [lojaId]);

  useEffect(() => { setLoading(true); carregar(); }, [carregar]);

  const alternar = async (produto, disponivel) => {
    setSalvando(produto.id);
    setProdutos((prev) => prev.map((p) => (p.id === produto.id ? { ...p, ativo: disponivel } : p)));
    try {
      await mesasService.setProdutoDisponivel(produto.id, disponivel);
      toast({ title: disponivel ? "Disponível" : "Indisponível", description: produto.nome });
    } catch (e) {
      setProdutos((prev) => prev.map((p) => (p.id === produto.id ? { ...p, ativo: !disponivel } : p)));
      toast({ title: "Erro ao salvar", description: produto.nome, variant: "destructive" });
    } finally {
      setSalvando(null);
    }
  };

  const filtrados = busca
    ? produtos.filter((p) => (p.nome || "").toLowerCase().includes(busca.toLowerCase()))
    : produtos;

  // Agrupa por categoria
  const grupos = {};
  for (const p of filtrados) {
    const cat = p.categoria || "Sem categoria";
    (grupos[cat] = grupos[cat] || []).push(p);
  }
  const categorias = Object.keys(grupos).sort();

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-10">
      <div className="bg-white px-4 py-3 border-b border-slate-100 sticky top-16 z-10">
        <div className="text-sm font-semibold text-slate-700 mb-2">Configuração de cardápio</div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item" className="h-10 pl-8 bg-slate-50" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {categorias.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">Nenhum produto encontrado.</div>
        )}
        {categorias.map((cat) => (
          <div key={cat}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{cat}</div>
            <div className="space-y-2">
              {grupos[cat].map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm truncate ${p.ativo ? "text-slate-800" : "text-slate-400 line-through"}`}>{p.nome}</div>
                    <div className="text-xs text-slate-500">
                      {fmtMoeda(p.preco_venda)} · {p.ativo ? "Disponível" : "Indisponível"}
                    </div>
                  </div>
                  <Switch
                    checked={!!p.ativo}
                    disabled={salvando === p.id}
                    onCheckedChange={(v) => alternar(p, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}