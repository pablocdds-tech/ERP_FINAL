import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Eye, Power } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import ContaBancariaDialog from "@/components/financeiro/ContaBancariaDialog";
import { calcularSaldosBancarios } from "@/lib/financeiro-service";

export default function ContasBancarias() {
  const [items, setItems] = useState([]);
  const [movs, setMovs] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    const [c, m, l] = await Promise.all([
      base44.entities.ContaBancaria.list("-created_date", 200),
      base44.entities.MovimentacaoBancaria.list("-data", 5000),
      base44.entities.Loja.list(),
    ]);
    setItems(c); setMovs(m); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const saldos = useMemo(() => calcularSaldosBancarios(items, movs), [items, movs]);
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "Corporativo";

  const toggle = async (c) => {
    await base44.entities.ContaBancaria.update(c.id, { ativo: c.ativo === false });
    load();
  };

  const totalGeral = items.filter((c) => c.ativo !== false)
    .reduce((s, c) => s + (saldos.get(c.id)?.saldo || 0), 0);

  return (
    <PageShell
      title="Contas Bancárias"
      description="Cadastro de contas e saldos bancários reais."
      actions={<Button onClick={() => setDialog({ open: true, mode: "create", record: null })}><Plus className="w-4 h-4 mr-1.5" />Nova conta</Button>}
    >
      <Card className="p-4 mb-4 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Saldo bancário total (contas ativas)</span>
        <span className={`font-mono font-semibold text-lg ${totalGeral < 0 ? "text-destructive" : ""}`}>R$ {totalGeral.toFixed(2)}</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Conta</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Nenhuma conta cadastrada.</TableCell></TableRow>
              ) : items.map((c) => {
                const saldo = saldos.get(c.id)?.saldo || 0;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.banco || "—"}</TableCell>
                    <TableCell><span className="text-xs uppercase text-muted-foreground">{c.tipo}</span></TableCell>
                    <TableCell>{lojaNome(c.loja_id)}</TableCell>
                    <TableCell className={`text-right font-mono ${saldo < 0 ? "text-destructive" : ""}`}>R$ {saldo.toFixed(2)}</TableCell>
                    <TableCell><StatusBadge ativo={c.ativo} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: c })}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "edit", record: c })}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(c)}><Power className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ContaBancariaDialog
        open={dialog.open} mode={dialog.mode} record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))} onSaved={load}
      />
    </PageShell>
  );
}