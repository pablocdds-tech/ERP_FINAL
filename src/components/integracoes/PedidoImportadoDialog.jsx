import { useEffect, useState } from "react";
import { cardapioWebService } from "@/lib/cardapio-web-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const fmtMoeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PedidoImportadoDialog({ pedido, isAdmin, open, onOpenChange }) {
  const [itens, setItens] = useState([]);
  useEffect(() => {
    if (pedido?.id && open) cardapioWebService.listItens(pedido.id).then((d) => setItens(d || []));
  }, [pedido, open]);

  if (!pedido) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>Pedido {pedido.order_number} <Badge variant="secondary" className="ml-2">Cardápio Web</Badge></DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><div className="text-muted-foreground text-xs">Cliente</div>{pedido.customer_name || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Telefone</div>{pedido.customer_phone || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Status</div>{pedido.status || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Pagamento</div>{pedido.payment_method || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Canal</div>{pedido.sales_channel || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Bairro</div>{pedido.neighborhood || "—"}</div>
          <div className="col-span-full"><div className="text-muted-foreground text-xs">Endereço</div>{pedido.delivery_address || "—"}</div>
          <div><div className="text-muted-foreground text-xs">Subtotal</div>{fmtMoeda(pedido.subtotal)}</div>
          <div><div className="text-muted-foreground text-xs">Entrega</div>{fmtMoeda(pedido.delivery_fee)}</div>
          <div><div className="text-muted-foreground text-xs">Desconto</div>{fmtMoeda(pedido.discount)}</div>
          <div><div className="text-muted-foreground text-xs">Total</div><strong>{fmtMoeda(pedido.total_amount)}</strong></div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Itens</div>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Qtd</TableHead><TableHead>Unit.</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {itens.length === 0 ? <TableRow><TableCell colSpan={5} className="text-muted-foreground">Sem itens.</TableCell></TableRow> : itens.map((i) => (
                  <TableRow key={i.id}><TableCell>{i.product_name}</TableCell><TableCell>{i.category_name || "—"}</TableCell><TableCell>{i.quantity}</TableCell><TableCell>{fmtMoeda(i.unit_price)}</TableCell><TableCell>{fmtMoeda(i.total_price)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Payload bruto (admin)</div>
            <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap max-h-64 overflow-auto">{pedido.raw_payload || "—"}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}