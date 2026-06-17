import { Button } from "@/components/ui/button";
import { Check, ChefHat, Clock, Utensils } from "lucide-react";

function minutosDecorridos(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// Cor do cabeçalho conforme tempo de espera (alerta de atraso).
function corUrgencia(min) {
  if (min >= 20) return "bg-red-600 text-white";
  if (min >= 10) return "bg-amber-500 text-white";
  return "bg-slate-800 text-white";
}

// Ticket de um pedido de produção (vindo do garçom, roteado por setor).
export default function ProducaoTicket({ pedido, agora, onAvancar, busy }) {
  const min = minutosDecorridos(pedido.enviado_em, agora);
  const itens = pedido.itens || [];
  const emProducao = pedido.status === "em_producao";
  const pronto = pedido.status === "pronto";

  return (
    <div className="rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900 flex flex-col">
      <div className={`px-3 py-2 flex items-center justify-between ${corUrgencia(min)}`}>
        <div className="flex items-center gap-2 font-bold text-lg">
          <Utensils className="w-4 h-4" /> Mesa {pedido.mesa_numero ?? "—"}
        </div>
        <div className="flex items-center gap-1 font-bold text-lg">
          <Clock className="w-4 h-4" /> {min}min
        </div>
      </div>

      <div className="p-3 flex-1 space-y-2">
        {pedido.garcom_nome && (
          <div className="text-sm text-slate-400 truncate">Garçom: {pedido.garcom_nome}</div>
        )}
        <ul className="space-y-1.5">
          {itens.map((it, i) => (
            <li key={i} className="text-white">
              <div className="flex gap-2">
                <span className="font-bold text-amber-400 text-lg leading-none">{it.quantidade || 1}×</span>
                <span className="font-medium text-lg leading-tight">{it.nome_produto}</span>
              </div>
              {it.detalhes && <div className="text-sm text-amber-300 pl-7">⚠ {it.detalhes}</div>}
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={() => onAvancar?.(pedido)}
        disabled={busy}
        className={`rounded-none h-12 text-base font-semibold ${
          pronto ? "bg-violet-600 hover:bg-violet-700" : emProducao ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pronto ? <><Check className="w-5 h-5" /> Entregar</> : emProducao ? <><Check className="w-5 h-5" /> Marcar Pronto</> : <><ChefHat className="w-5 h-5" /> Iniciar preparo</>}
      </Button>
    </div>
  );
}