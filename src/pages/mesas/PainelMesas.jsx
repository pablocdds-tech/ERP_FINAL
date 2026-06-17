import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { mesasService, getMesaStatus } from "@/lib/mesas-service";
import { useMesas } from "@/lib/MesasContext";
import { RefreshCw, UserCog } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Grade de mesas. Verde=livre, ocupada/aberta com cor, confirma antes de abrir.
export default function PainelMesas() {
  const { lojaId, garcom, setGarcom, config } = useMesas() || {};
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmar, setConfirmar] = useState(null); // mesa a abrir
  const [abrindo, setAbrindo] = useState(false);

  // Sem garçom selecionado → volta para a seleção
  useEffect(() => { if (garcom === null) navigate("/mesas/garcom"); }, [garcom, navigate]);

  const carregar = useCallback(() => {
    if (!lojaId) { setLoading(false); return; }
    mesasService.listMesas(lojaId).then((l) => { setMesas(l); setLoading(false); });
  }, [lojaId]);

  useEffect(() => { setLoading(true); carregar(); }, [carregar]);

  const aoTocarMesa = (mesa) => {
    if (mesa.status === "livre") {
      setConfirmar(mesa);
    } else {
      // Mesa já tem comanda — vai direto para os produtos/resumo
      irParaComanda(mesa);
    }
  };

  const irParaComanda = async (mesa) => {
    let comandaId = mesa.comanda_atual_id;
    if (!comandaId) {
      const c = await mesasService.getComandaPorMesa(mesa.id);
      comandaId = c?.id;
    }
    if (comandaId) navigate(`/mesas/comanda/${comandaId}`);
    else setConfirmar(mesa);
  };

  const confirmarAbertura = async () => {
    if (!confirmar) return;
    setAbrindo(true);
    const comanda = await mesasService.abrirMesa({ mesa: confirmar, garcom, lojaId, config });
    setAbrindo(false);
    setConfirmar(null);
    navigate(`/mesas/comanda/${comanda.id}?nova=1`);
  };

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Mesas</h1>
        <div className="flex items-center gap-2">
          <button onClick={carregar} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setGarcom(null); navigate("/mesas/garcom"); }} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95">
            <UserCog className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mb-4 text-[11px]">
        <Legenda cor="bg-emerald-500" label="Livre" />
        <Legenda cor="bg-blue-500" label="Aberta" />
        <Legenda cor="bg-orange-500" label="Ocupada" />
        <Legenda cor="bg-amber-500" label="Em produção" />
        <Legenda cor="bg-violet-500" label="Conta" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhuma mesa cadastrada. Configure as mesas no ERP.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5">
          {mesas.map((m) => {
            const st = getMesaStatus(m.status);
            return (
              <button
                key={m.id}
                onClick={() => aoTocarMesa(m)}
                className={`aspect-square rounded-xl font-bold text-lg flex flex-col items-center justify-center shadow-sm active:scale-95 transition-transform ${st.cor}`}
              >
                {m.numero}
                <span className="text-[9px] font-medium opacity-90 leading-none mt-0.5">{st.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmar} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abrir mesa {confirmar?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma nova comanda para o garçom <strong>{garcom?.nome}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={abrindo}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAbertura} disabled={abrindo} className="bg-emerald-600 hover:bg-emerald-700">
              {abrindo ? "Abrindo..." : "Sim, abrir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const Legenda = ({ cor, label }) => (
  <div className="flex items-center gap-1 text-slate-600">
    <span className={`w-3 h-3 rounded ${cor}`} />
    {label}
  </div>
);