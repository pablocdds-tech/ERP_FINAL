import { useEffect, useState } from "react";
import { mesasService, fmtMoeda, tamanhoPizza } from "@/lib/mesas-service";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Check, X, Search } from "lucide-react";

// Fluxo de pizza em abas: borda → sabores → resumo do item.
// Limite de sabores vem da config da loja conforme o tamanho.
export default function PizzaDialog({ produto, comanda, lojaId, config, onClose, onConfirmado }) {
  const tamanho = tamanhoPizza(produto);
  const maxSabores =
    tamanho === "pequena" ? (config?.sabores_pizza_pequena ?? 1)
    : tamanho === "grande" ? (config?.sabores_pizza_grande ?? 3)
    : (config?.sabores_pizza_media ?? 2);
  const bordaObrigatoria = config?.borda_obrigatoria ?? true;

  const [aba, setAba] = useState("borda");
  const [bordas, setBordas] = useState([]);
  const [sabores, setSabores] = useState([]);
  const [bordaSel, setBordaSel] = useState(null);
  const [saboresSel, setSaboresSel] = useState([]);
  const [observacao, setObservacao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    mesasService.listModificadores("borda", lojaId).then(setBordas);
    mesasService.listModificadores("sabor", lojaId).then(setSabores);
  }, [lojaId]);

  const toggleSabor = (s) => {
    setSaboresSel((prev) => {
      const existe = prev.find((x) => x.id === s.id);
      if (existe) return prev.filter((x) => x.id !== s.id);
      if (prev.length >= maxSabores) return prev; // respeita o máximo
      return [...prev, s];
    });
  };

  const podeConfirmar = saboresSel.length >= 1 && (!bordaObrigatoria || bordaSel);

  const confirmar = async () => {
    if (!podeConfirmar) return;
    setSalvando(true);
    const opcoes = [];
    if (bordaSel) opcoes.push({ grupo_nome: "Borda", opcao_nome: bordaSel.nome, preco_adicional: Number(bordaSel.preco_adicional || 0) });
    saboresSel.forEach((s) => opcoes.push({ grupo_nome: "Sabor", opcao_nome: s.nome, preco_adicional: Number(s.preco_adicional || 0) }));
    await mesasService.adicionarItem({ comanda, produto, quantidade, opcoes, observacao, tamanho });
    setSalvando(false);
    onConfirmado();
  };

  const precoAdd = (bordaSel ? Number(bordaSel.preco_adicional || 0) : 0)
    + saboresSel.reduce((s, x) => s + Number(x.preco_adicional || 0), 0);
  const totalItem = (Number(produto.preco_venda || 0) + precoAdd) * quantidade;

  const saboresFiltrados = sabores.filter((s) => !busca || (s.nome || "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-100 leading-none">Opções do produto</div>
            <div className="font-bold truncate">{produto.nome}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 text-sm font-medium">
          {[["borda", "Borda"], ["sabores", `Sabores (${saboresSel.length}/${maxSabores})`], ["resumo", "Resumo"]].map(([k, label]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`flex-1 py-2.5 ${aba === k ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {aba === "borda" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-1">Mín: 1 · Máx: 1{bordaObrigatoria ? " · obrigatória" : ""}</p>
              {bordas.length === 0 && <Vazio texto="Nenhuma borda cadastrada." />}
              {bordas.map((b) => (
                <OptionRow key={b.id} nome={b.nome} preco={b.preco_adicional}
                  selecionado={bordaSel?.id === b.id}
                  onClick={() => { setBordaSel(bordaSel?.id === b.id ? null : b); setAba("sabores"); }} />
              ))}
            </div>
          )}

          {aba === "sabores" && (
            <div className="space-y-2">
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar sabor" className="h-9 pl-8 bg-slate-50" />
              </div>
              <p className="text-xs text-slate-500">Escolha até {maxSabores} sabor(es).</p>
              {saboresFiltrados.length === 0 && <Vazio texto="Nenhum sabor cadastrado." />}
              {saboresFiltrados.map((s) => (
                <OptionRow key={s.id} nome={s.nome} preco={s.preco_adicional}
                  selecionado={!!saboresSel.find((x) => x.id === s.id)}
                  onClick={() => toggleSabor(s)} />
              ))}
            </div>
          )}

          {aba === "resumo" && (
            <div className="space-y-3">
              <ResumoLinha label="Produto" valor={produto.nome} />
              <ResumoLinha label="Borda" valor={bordaSel?.nome || "—"} />
              <ResumoLinha label="Sabores" valor={saboresSel.map((s) => s.nome).join(", ") || "—"} />
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Observação</label>
                <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: sem cebola, bem assada..." className="bg-slate-50" rows={2} />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
              <span className="w-7 text-center font-bold">{quantidade}</span>
              <button onClick={() => setQuantidade((q) => q + 1)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Total do item</div>
              <div className="font-bold text-blue-700">{fmtMoeda(totalItem)}</div>
            </div>
          </div>
          <button onClick={confirmar} disabled={!podeConfirmar || salvando}
            className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.99]">
            <Check className="w-5 h-5" /> {salvando ? "Adicionando..." : "Confirmar item"}
          </button>
          {!podeConfirmar && <p className="text-[11px] text-center text-amber-600">Escolha {bordaObrigatoria ? "a borda e " : ""}pelo menos 1 sabor.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const OptionRow = ({ nome, preco, selecionado, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left active:scale-[0.99] ${selecionado ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
    <span className="font-medium text-slate-800 text-sm">{nome}</span>
    <span className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{Number(preco || 0) > 0 ? `+ ${fmtMoeda(preco)}` : "Grátis"}</span>
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${selecionado ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        {selecionado ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </span>
  </button>
);

const ResumoLinha = ({ label, valor }) => (
  <div className="flex justify-between gap-3 text-sm border-b border-slate-100 pb-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800 text-right">{valor}</span>
  </div>
);

const Vazio = ({ texto }) => <div className="text-center py-8 text-slate-400 text-sm">{texto}</div>;