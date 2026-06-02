import { Button } from "@/components/ui/button";
import { Check, ChefHat, Clock } from "lucide-react";
import { PDV_CANAIS } from "@/lib/pdv-service";

function minutosDecorridos(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// Cor do cabeçalho conforme tempo de espera (alerta de atraso na cozinha)
function corUrgencia(min) {
  if (min >= 20) return "bg-red-600 text-white";
  if (min >= 10) return "bg-amber-500 text-white";
  return "bg-slate-800 text-white";
}

export default function KdsTicket({ pedido, agora, onAvancar, busy }) {
  // agora é passado de fora para recalcular o cronômetro a cada tick
  const min = minutosDecorridos(pedido.recebido_em, agora);
  const itens = pedido.itens || [];
  const isPreparo = pedido.status === "em_preparo";

  return (
    <div className="rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900 flex flex-col">
      <div className={`px-3 py-2 flex items-center justify-between ${corUrgencia(min)}`}>
        <div className="flex items-center gap-2 font-bold text-lg">
          #{pedido.numero_pedido || "—"}
          <span className="text-xs font-medium opacity-80">{PDV_CANAIS[pedido.canal] || pedido.canal}</span>
        </div>
        <div className="flex items-center gap-1 font-bold text-lg">
          <Clock className="w-4 h-4" /> {min}min
        </div>
      </div>

      <div className="p-3 flex-1 space-y-2">
        {pedido.cliente_nome && (
          <div className="text-sm text-slate-400 truncate">{pedido.cliente_nome}</div>
        )}
        <ul className="space-y-1.5">
          {itens.map((it, i) => (
            <li key={i} className="text-white">
              <div className="flex gap-2">
                <span className="font-bold text-amber-400 text-lg leading-none">{it.quantidade || 1}×</span>
                <span className="font-medium text-lg leading-tight">{it.produto_nome}</span>
              </div>
              {it.observacao && <div className="text-sm text-amber-300 pl-7">⚠ {it.observacao}</div>}
            </li>
          ))}
        </ul>
        {pedido.observacoes && (
          <div className="text-sm text-amber-300 border-t border-slate-700 pt-2">⚠ {pedido.observacoes}</div>
        )}
      </div>

      <Button
        onClick={() => onAvancar?.(pedido)}
        disabled={busy}
        className={`rounded-none h-12 text-base font-semibold ${isPreparo ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"}`}
      >
        {isPreparo ? <><Check className="w-5 h-5" /> Marcar Pronto</> : <><ChefHat className="w-5 h-5" /> Despachar</>}
      </Button>
    </div>
  );
}