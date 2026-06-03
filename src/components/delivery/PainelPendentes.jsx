import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MapPin } from "lucide-react";
import PedidoCard from "./PedidoCard";
import { agruparPendentes } from "@/lib/delivery-config";

export default function PainelPendentes({
  pedidos, busca, setBusca, selecionados, onToggle, onClickPedido, onCriarRota, podeCriar,
}) {
  const filtrados = pedidos.filter((p) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return (
      String(p.numero_pedido).toLowerCase().includes(t) ||
      String(p.cliente_nome).toLowerCase().includes(t) ||
      String(p.bairro).toLowerCase().includes(t)
    );
  });
  const grupos = agruparPendentes(filtrados);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar nº pedido ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={!podeCriar || selecionados.length === 0}
          onClick={onCriarRota}
        >
          <Plus className="w-4 h-4" /> Rota ({selecionados.length})
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {grupos.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhum pedido pendente.
          </div>
        )}
        {grupos.map((g) => (
          <div key={g.key}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>{g.label}</span>
              <span className="text-muted-foreground">{g.itens.length}</span>
            </div>
            <div className="space-y-2">
              {g.itens.map((p) => (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  selecionado={selecionados.includes(p.id)}
                  onToggle={onToggle}
                  onClick={onClickPedido}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}