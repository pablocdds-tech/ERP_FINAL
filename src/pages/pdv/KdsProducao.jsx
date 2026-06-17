import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, Pizza, Wine, ArrowLeft } from "lucide-react";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import ProducaoTicket from "@/components/pdv/ProducaoTicket";
import { producaoService, SETORES_PRODUCAO } from "@/lib/producao-service";

const SETOR_ICONS = { cozinha: ChefHat, pizzaria: Pizza, bar: Wine };

// KDS de produção das mesas — uma aba por setor. Ao lançar o pedido (garçom
// "Enviar cozinha"), os itens roteados aparecem aqui na tela do setor correto.
export default function KdsProducao() {
  const [setor, setSetor] = useState("cozinha");
  const [pedidos, setPedidos] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [agora, setAgora] = useState(Date.now());

  const carregar = useCallback(async () => {
    const lista = await producaoService.listAtivos(setor, lojaId);
    setPedidos(lista);
  }, [setor, lojaId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Tempo real
  useEffect(() => {
    const unsub = producaoService.subscribe(() => carregar());
    return () => unsub?.();
  }, [carregar]);

  // Tick do cronômetro a cada 30s
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const avancar = async (pedido) => {
    setBusyId(pedido.id);
    await producaoService.avancar(pedido);
    await carregar();
    setBusyId(null);
  };

  const fila = pedidos.filter((p) => p.status === "enviado" || p.status === "em_producao");
  const prontos = pedidos.filter((p) => p.status === "pronto");
  const SetorIcon = SETOR_ICONS[setor] || ChefHat;
  const setorLabel = SETORES_PRODUCAO.find((s) => s.value === setor)?.label || "Setor";

  return (
    <div className="fixed inset-0 bg-slate-950 text-white overflow-y-auto z-50">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-3 z-10 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
            <Link to="/admin/pdv"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2"><SetorIcon className="w-6 h-6 text-amber-400" /> {setorLabel} — KDS</h1>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {SETORES_PRODUCAO.map((s) => {
              const Icon = SETOR_ICONS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => setSetor(s.value)}
                  className={`px-3 py-2 text-sm font-semibold flex items-center gap-1.5 ${setor === s.value ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                >
                  <Icon className="w-4 h-4" /> {s.label}
                </button>
              );
            })}
          </div>
          <div className="w-48">
            <div className="[&_button]:bg-slate-800 [&_button]:border-slate-700 [&_button]:text-white">
              <LojaSingleSelect value={lojaId} onChange={setLojaId} emptyLabel="Todas as lojas" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            Em produção <span className="text-sm bg-slate-700 rounded-full px-2 py-0.5">{fila.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fila.length === 0 ? (
              <div className="col-span-full text-slate-500 text-center py-12">Nenhum pedido na fila</div>
            ) : (
              fila.map((p) => <ProducaoTicket key={p.id} pedido={p} agora={agora} onAvancar={avancar} busy={busyId === p.id} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            Prontos <span className="text-sm bg-slate-700 rounded-full px-2 py-0.5">{prontos.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prontos.length === 0 ? (
              <div className="col-span-full text-slate-500 text-center py-12">Nenhum pedido pronto</div>
            ) : (
              prontos.map((p) => <ProducaoTicket key={p.id} pedido={p} agora={agora} onAvancar={avancar} busy={busyId === p.id} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}