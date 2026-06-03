import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, AlertTriangle } from "lucide-react";
import { ORIGENS, fmtMoeda, minutosAguardando } from "@/lib/delivery-service";

export default function PedidoCard({ pedido, selecionado, onToggle, onClick }) {
  const semCoord = pedido.latitude == null || pedido.longitude == null;
  const espera = minutosAguardando(pedido.criado_em);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors cursor-pointer ${
        selecionado ? "border-blue-500 bg-blue-50" : "border-border bg-card hover:bg-accent"
      }`}
      onClick={() => onClick?.(pedido)}
    >
      <div className="flex items-start gap-2">
        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox checked={selecionado} onCheckedChange={() => onToggle?.(pedido)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">#{pedido.numero_pedido}</span>
            <span className="text-sm font-semibold">{fmtMoeda(pedido.total)}</span>
          </div>
          <div className="text-sm truncate">{pedido.cliente_nome}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{pedido.bairro || "—"} · {pedido.endereco_completo || "sem endereço"}</span>
          </div>
          {pedido.cliente_telefone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" /> {pedido.cliente_telefone}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <Badge variant="outline" className="text-[10px]">{ORIGENS[pedido.origem] || pedido.origem}</Badge>
            <Badge variant="outline" className="text-[10px]">{pedido.forma_pagamento || "—"}</Badge>
            {pedido.pronto_para_entrega && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Pronto</Badge>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" /> {espera}min
            </span>
            {semCoord && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                <AlertTriangle className="w-3 h-3" /> sem coordenada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}