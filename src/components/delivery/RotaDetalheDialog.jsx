import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CheckCircle2, AlertTriangle, Trash2, Bike } from "lucide-react";
import {
  deliveryService, getRouteStatus, getDeliveryStatus, fmtMoeda, DELIVERY_STATUS,
} from "@/lib/delivery-service";

const PROBLEMAS = DELIVERY_STATUS.filter((s) => !["pendente", "em_rota", "entregue"].includes(s.value));

export default function RotaDetalheDialog({ open, onOpenChange, rota, perms, onChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    if (!rota) return;
    setLoading(true);
    setOrders(await deliveryService.getRotaOrders(rota.id));
    setLoading(false);
  };
  useEffect(() => { if (open) carregar(); }, [open, rota?.id]);

  if (!rota) return null;
  const st = getRouteStatus(rota.status);
  const podeDespachar = perms.despachar && rota.status === "criada";
  const ativos = orders.filter((o) => o.delivery_status !== "entregue");
  const podeConcluir = perms.concluir && ["despachada", "em_andamento"].includes(rota.status) &&
    orders.length > 0 && orders.every((o) => o.delivery_status !== "em_rota");

  const acao = async (fn) => { await fn(); await carregar(); onChanged?.(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rota.route_number}
            <Badge className={`text-[10px] ${st.cor}`} variant="outline">{st.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Bike className="w-4 h-4" /> {rota.motoboy_name || "Sem motoboy"} · {rota.total_orders} pedidos · {fmtMoeda(rota.total_amount)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-center bg-accent rounded-lg p-2">
          <div><div className="text-muted-foreground">Dinheiro</div><b>{fmtMoeda(rota.total_cash_to_collect)}</b></div>
          <div><div className="text-muted-foreground">Cartão/Pix</div><b>{fmtMoeda(rota.total_card_offline)}</b></div>
          <div><div className="text-muted-foreground">Online</div><b>{fmtMoeda(rota.total_online_paid)}</b></div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>}
          {orders.map((o) => {
            const ds = getDeliveryStatus(o.delivery_status);
            const finalizado = o.delivery_status !== "pendente" && o.delivery_status !== "em_rota";
            return (
              <div key={o.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{o.sequence}. #{o.numero_pedido} — {o.customer_name}</span>
                  <Badge className={`text-[10px] ${ds.cor}`} variant="outline">{ds.label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{o.neighborhood} · {o.address} · {fmtMoeda(o.order_total)}</div>

                {["despachada", "em_andamento"].includes(rota.status) && !finalizado && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => acao(() => deliveryService.marcarEntrega(o, "entregue"))}>
                      <CheckCircle2 className="w-3 h-3" /> Entregue
                    </Button>
                    <Select onValueChange={(v) => acao(() => deliveryService.marcarEntrega(o, v))}>
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Problema..." /></SelectTrigger>
                      <SelectContent>
                        {PROBLEMAS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {rota.status === "criada" && perms.editar && (
                  <Button size="sm" variant="ghost" className="h-7 mt-1 text-red-600"
                    onClick={() => acao(() => deliveryService.removerPedido(rota.id, o, false))}>
                    <Trash2 className="w-3 h-3" /> Remover
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {podeDespachar && (
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700"
              onClick={() => acao(() => deliveryService.despachar(rota))}>
              <Truck className="w-4 h-4" /> Despachar rota
            </Button>
          )}
          {podeConcluir && (
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => acao(() => deliveryService.concluirRota(rota))}>
              <CheckCircle2 className="w-4 h-4" /> Concluir rota
            </Button>
          )}
          {perms.cancelar && !["concluida", "cancelada"].includes(rota.status) && (
            <Button variant="outline" className="text-red-600"
              onClick={() => acao(() => deliveryService.cancelarRota(rota, "Cancelada manualmente"))}>
              <AlertTriangle className="w-4 h-4" /> Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}