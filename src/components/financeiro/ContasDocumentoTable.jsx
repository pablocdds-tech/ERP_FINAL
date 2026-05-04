import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Pencil, Banknote, Trash2 } from "lucide-react";
import ContaStatusBadge from "./ContaStatusBadge";
import { format } from "date-fns";

export default function ContasDocumentoTable({ items, lojas, isPagar, onView, onEdit, onBaixar, onExcluir }) {
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>{isPagar ? "Fornecedor" : "Cliente"}</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">{isPagar ? "Pago" : "Recebido"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhum lançamento.</TableCell></TableRow>
            ) : items.map((d) => {
              const podeBaixar = d.status !== "paga" && d.status !== "recebida" && d.status !== "cancelada";
              const valorMov = Number((isPagar ? d.valor_pago : d.valor_recebido) || 0);
              const podeExcluir = valorMov === 0 && d.status !== "paga" && d.status !== "recebida";
              return (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell>{d.data_vencimento ? format(new Date(d.data_vencimento), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{d.descricao || "—"}</TableCell>
                  <TableCell>{isPagar ? (d.fornecedor_nome || "—") : (d.cliente || "—")}</TableCell>
                  <TableCell>{lojaNome(d.loja_id)}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(d.valor || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    R$ {Number((isPagar ? d.valor_pago : d.valor_recebido) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell><ContaStatusBadge status={d.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(d)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(d)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {podeBaixar && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onBaixar(d)} title="Baixar">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      {onExcluir && podeExcluir && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onExcluir(d)} title="Excluir">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}