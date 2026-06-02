import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowLeft } from "lucide-react";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import KdsTicket from "@/components/pdv/KdsTicket";
import { pdvService } from "@/lib/pdv-service";
import { base44 } from "@/api/base44Client";

// KDS — Kitchen Display System. Tela fullscreen escura para a cozinha.
export default function KdsTela() {
  const [pedidos, setPedidos] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [agora, setAgora] = useState(Date.now());

  const carregar = useCallback(async () => {
    const query = { status: { $in: ["em_preparo", "pronto"] } };
    if (lojaId) query.loja_id = lojaId;
    const lista = await base44.entities.pdv_pedido.filter(query, "recebido_em", 200);
    setPedidos(lista);
  }, [lojaId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Tempo real
  useEffect(() => {
    const unsub = pdvService.subscribe(() => carregar());
    return () => unsub?.();
  }, [carregar]);

  // Tick do cronômetro a cada 30s
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const avancar = async (pedido) => {
    setBusyId(pedido.id);
    await pdvService.avancar(pedido);
    await carregar();
    setBusyId(null);
  };

  const emPreparo = pedidos.filter((p) => p.status === "em_preparo");
  const prontos = pedidos.filter((p) => p.status === "pronto");

  return (
    <div className="fixed inset-0 bg-slate-950 text-white overflow-y-auto z-50">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
            <Link to="/admin/pdv"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2"><ChefHat className="w-6 h-6 text-amber-400" /> Cozinha — KDS</h1>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo</span>
        </div>
        <div className="w-56">
          <div className="[&_button]:bg-slate-800 [&_button]:border-slate-700 [&_button]:text-white">
            <LojaSingleSelect value={lojaId} onChange={setLojaId} emptyLabel="Todas as lojas" />
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            Em preparo <span className="text-sm bg-slate-700 rounded-full px-2 py-0.5">{emPreparo.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emPreparo.length === 0 ? (
              <div className="col-span-full text-slate-500 text-center py-12">Nenhum pedido em preparo</div>
            ) : (
              emPreparo.map((p) => <KdsTicket key={p.id} pedido={p} agora={agora} onAvancar={avancar} busy={busyId === p.id} />)
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
              prontos.map((p) => <KdsTicket key={p.id} pedido={p} agora={agora} onAvancar={avancar} busy={busyId === p.id} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}