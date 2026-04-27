import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Ticket } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/marketing/PageShell";
import CupomDialog from "@/components/marketing/CupomDialog";

export default function Cupons() {
  const [items, setItems] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });

  const load = async () => {
    const [c, ca] = await Promise.all([
      base44.entities.Cupom.list("-created_date"),
      base44.entities.Campanha.list(),
    ]);
    setItems(c); setCampanhas(ca);
  };
  useEffect(() => { load(); }, []);

  const fmtDesc = (c) => {
    if (c.tipo_desconto === "frete_gratis") return "Frete grátis";
    if (c.tipo_desconto === "percentual") return `${c.valor_desconto || 0}%`;
    return `R$ ${(c.valor_desconto || 0).toFixed(2)}`;
  };

  return (
    <PageShell title="Cupons" description="Cupons de desconto com regras de canal, loja e validade."
      actions={<Button onClick={() => setDlg({ open: true, item: null })}><Plus className="w-4 h-4 mr-1" /> Novo cupom</Button>}>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum cupom cadastrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Mín. pedido</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Ticket className="w-3.5 h-3.5 text-primary" /> {c.codigo}
                    </div>
                  </TableCell>
                  <TableCell>{fmtDesc(c)}</TableCell>
                  <TableCell>{c.valor_minimo_pedido ? `R$ ${c.valor_minimo_pedido.toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="text-xs">
                    {c.data_inicio && format(new Date(c.data_inicio), "dd/MM/yy")}
                    {c.data_fim ? ` → ${format(new Date(c.data_fim), "dd/MM/yy")}` : ""}
                  </TableCell>
                  <TableCell>{c.usos_atuais || 0}{c.limite_total_usos ? `/${c.limite_total_usos}` : ""}</TableCell>
                  <TableCell>
                    <Badge className={c.ativo !== false ? "bg-emerald-100 text-emerald-700" : "bg-muted"}>
                      {c.ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDlg({ open: true, item: c })}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <CupomDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: dlg.item })}
        item={dlg.item} onSaved={load} campanhas={campanhas} />
    </PageShell>
  );
}