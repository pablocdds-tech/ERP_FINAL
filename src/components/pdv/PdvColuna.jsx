import { Badge } from "@/components/ui/badge";
import PdvPedidoCard from "./PdvPedidoCard";

export default function PdvColuna({ statusInfo, pedidos, onAvancar, onAbrir, onCancelar, busyId }) {
  return (
    <div className="flex flex-col bg-muted/40 rounded-xl min-h-[60vh]">
      <div className="px-3 py-2.5 flex items-center justify-between border-b sticky top-0 bg-muted/40 rounded-t-xl backdrop-blur z-10">
        <span className="text-sm font-semibold">{statusInfo.label}</span>
        <Badge variant="secondary" className="text-xs">{pedidos.length}</Badge>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {pedidos.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">Sem pedidos</div>
        ) : (
          pedidos.map((p) => (
            <PdvPedidoCard
              key={p.id}
              pedido={p}
              onAvancar={onAvancar}
              onAbrir={onAbrir}
              onCancelar={onCancelar}
              busy={busyId === p.id}
            />
          ))
        )}
      </div>
    </div>
  );
}