import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, ChevronRight, X } from "lucide-react";
import { PDV_CANAIS, proximoStatus, getStatusInfo } from "@/lib/pdv-service";
import { fmtMoeda } from "@/lib/format";

function tempoDecorrido(iso) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, "0")}`;
}

export default function PdvPedidoCard({ pedido, onAvancar, onAbrir, onCancelar, busy }) {
  const prox = proximoStatus(pedido);
  const proxInfo = prox ? getStatusInfo(prox) : null;
  const itens = pedido.itens || [];

  return (
    <Card className="p-3 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onAbrir?.(pedido)} className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">#{pedido.numero_pedido || "—"}</span>
            <Badge variant="outline" className="text-[10px]">{PDV_CANAIS[pedido.canal] || pedido.canal}</Badge>
          </div>
          <div className="text-sm truncate mt-0.5">{pedido.cliente_nome || "Cliente"}</div>
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" /> {tempoDecorrido(pedido.recebido_em)}
        </div>
      </div>

      <button onClick={() => onAbrir?.(pedido)} className="w-full text-left space-y-1">
        <div className="text-xs text-muted-foreground space-y-0.5">
          {itens.slice(0, 3).map((it, i) => (
            <div key={i} className="truncate">{it.quantidade || 1}× {it.produto_nome}</div>
          ))}
          {itens.length > 3 && <div className="italic">+{itens.length - 3} item(ns)…</div>}
        </div>
        {pedido.bairro && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" /> {pedido.bairro}</div>
        )}
        {pedido.cliente_telefone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> {pedido.cliente_telefone}</div>
        )}
      </button>

      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-semibold text-sm">{fmtMoeda(pedido.total)}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => onCancelar?.(pedido)} disabled={busy} title="Cancelar">
            <X className="w-4 h-4" />
          </Button>
          {proxInfo && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onAvancar?.(pedido)} disabled={busy}>
              {proxInfo.label} <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}