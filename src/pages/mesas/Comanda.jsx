import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { mesasService, fmtMoeda, formatarDetalhes } from "@/lib/mesas-service";
import { Plus, Minus, Trash2, Send, Printer, Save, Receipt, Pizza } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Resumo da comanda: itens lançados, totais e ações (salvar, enviar, fechar).
export default function Comanda() {
  const { comandaId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [comanda, setComanda] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState(false);
  const [confirmFechar, setConfirmFechar] = useState(false);

  const carregar = useCallback(async () => {
    const c = await mesasService.getComanda(comandaId);
    const its = await mesasService.getItens(comandaId);
    setComanda(c);
    setItens(its);
    setLoading(false);
  }, [comandaId]);

  useEffect(() => { setLoading(true); carregar(); }, [carregar]);

  const temRascunho = itens.some((i) => i.status === "rascunho");

  const mudarQtd = async (item, delta) => {
    const nova = item.quantidade + delta;
    if (nova < 1) return;
    await mesasService.atualizarQuantidade(item, nova);
    carregar();
  };

  const remover = async (item) => {
    await mesasService.removerItem(item);
    carregar();
  };

  const salvar = async () => {
    setAcao(true);
    await mesasService.salvarComanda(comanda);
    setAcao(false);
    toast({ title: "Pedido salvo", description: `Mesa ${comanda.mesa_numero} ocupada.` });
    navigate("/mesas/painel");
  };

  const enviar = async () => {
    setAcao(true);
    const r = await mesasService.enviarParaProducao(comanda);
    setAcao(false);
    if (r.enviados === 0) { toast({ title: "Nada para enviar", description: "Não há itens em rascunho." }); return; }
    toast({ title: "Enviado para produção", description: `${r.enviados} item(ns) na fila da cozinha/bar.` });
    carregar();
  };

  const fechar = async () => {
    if (temRascunho) { setConfirmFechar(true); return; }
    await solicitarFechamento();
  };
  const solicitarFechamento = async () => {
    setAcao(true);
    await mesasService.solicitarFechamento(comanda);
    setAcao(false);
    setConfirmFechar(false);
    toast({ title: "Fechamento solicitado", description: `Mesa ${comanda.mesa_numero} encaminhada ao caixa.` });
    navigate("/mesas/painel");
  };

  if (loading || !comanda) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-44">
      {/* Resumo topo */}
      <div className="bg-white px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">Mesa {comanda.mesa_numero}</h1>
          <span className="text-xs text-slate-400">Comanda {comanda.codigo} · {comanda.garcom_nome}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <Stat label="Itens" valor={itens.length} />
          <Stat label="Subtotal" valor={fmtMoeda(comanda.subtotal)} />
          <Stat label="Total" valor={fmtMoeda(comanda.total)} destaque />
        </div>
      </div>

      {/* Lista de itens */}
      <div className="px-4 py-4">
        {itens.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Nenhum item lançado. Toque em "Adicionar produtos".
          </div>
        ) : (
          <div className="space-y-2.5">
            {itens.map((item) => {
              const detalhes = formatarDetalhes(item);
              const enviado = item.status !== "rascunho";
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    {item.eh_pizza && <Pizza className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 text-sm truncate">{item.nome_produto}</span>
                        <span className="font-semibold text-slate-800 text-sm shrink-0">{fmtMoeda(item.total)}</span>
                      </div>
                      {detalhes && <p className="text-xs text-slate-500 mt-0.5">{detalhes}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {enviado ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">Enviado</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => mudarQtd(item, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-6 text-center font-semibold text-sm">{item.quantidade}</span>
                            <button onClick={() => mudarQtd(item, 1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                        {!enviado && (
                          <button onClick={() => remover(item)} className="text-red-500 p-1.5 active:scale-90"><Trash2 className="w-4 h-4" /></button>
                        )}
                        {enviado && <span className="text-xs text-slate-400">Qtd: {item.quantidade}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => navigate(`/mesas/comanda/${comandaId}/produtos`)}
          className="w-full mt-4 bg-blue-600 text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Plus className="w-5 h-5" /> Adicionar produtos
        </button>
      </div>

      {/* Rodapé fixo de ações */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={salvar} disabled={acao} className="bg-emerald-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50">
            <Save className="w-4 h-4" /> Salvar
          </button>
          <button onClick={enviar} disabled={acao || !temRascunho} className="bg-blue-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40">
            <Send className="w-4 h-4" /> Enviar cozinha
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button disabled className="bg-slate-100 text-slate-400 rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={fechar} disabled={acao} className="bg-violet-600 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 text-sm active:scale-[0.99] disabled:opacity-50">
            <Receipt className="w-4 h-4" /> Fechar conta
          </button>
        </div>
      </div>

      <AlertDialog open={confirmFechar} onOpenChange={setConfirmFechar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Há itens em rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Existem itens ainda não enviados para a cozinha. Deseja solicitar o fechamento mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={solicitarFechamento} className="bg-violet-600 hover:bg-violet-700">Solicitar fechamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const Stat = ({ label, valor, destaque }) => (
  <div className={`rounded-lg py-2 ${destaque ? "bg-blue-50" : "bg-slate-50"}`}>
    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`text-sm font-bold ${destaque ? "text-blue-700" : "text-slate-800"}`}>{valor}</div>
  </div>
);