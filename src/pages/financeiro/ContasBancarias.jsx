import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Eye, Power, Trash2 } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import ContaBancariaDialog from "@/components/financeiro/ContaBancariaDialog";
import ExcluirContaBancariaDialog from "@/components/financeiro/ExcluirContaBancariaDialog";
import { calcularSaldosBancarios } from "@/lib/financeiro-service";

export default function ContasBancarias() {
  const [items, setItems] = useState([]);
  const [movs, setMovs] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });
  const [excluir, setExcluir] = useState({ open: false, conta: null });

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

  const naturezaOf = (c) => c.natureza || (c.tipo === "cartao_pf" || c.tipo === "cheque_especial_pf" ? "PF_USO_OPERACIONAL" : "PJ");
  const ativas = items.filter((c) => c.ativo !== false);
  const totalPJ = ativas.filter((c) => naturezaOf(c) === "PJ").reduce((s, c) => s + (saldos.get(c.id)?.saldo || 0), 0);
  const totalPF = ativas.filter((c) => naturezaOf(c) === "PF_USO_OPERACIONAL").reduce((s, c) => s + (saldos.get(c.id)?.saldo || 0), 0);
  const totalVI = ativas.filter((c) => naturezaOf(c) === "VIRTUAL_INTERNO").reduce((s, c) => s + (saldos.get(c.id)?.saldo || 0), 0);
  const NAT_LABEL = { PJ: "PJ", PF_USO_OPERACIONAL: "PF op.", VIRTUAL_INTERNO: "Virtual" };
  const NAT_CLS = { PJ: "bg-emerald-50 text-emerald-700 border-emerald-200", PF_USO_OPERACIONAL: "bg-amber-50 text-amber-700 border-amber-200", VIRTUAL_INTERNO: "bg-blue-50 text-blue-700 border-blue-200" };

  return (
    <PageShell
      title="Contas Bancárias"
      description="Cadastro de contas e saldos bancários reais."
      actions={<Button onClick={() => setDialog({ open: true, mode: "create", record: null })}><Plus className="w-4 h-4 mr-1.5" />Nova conta</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Saldo PJ (empresa)</div>
          <div className={`mt-1 font-mono font-semibold text-lg ${totalPJ < 0 ? "text-destructive" : ""}`}>R$ {totalPJ.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Saldo PF operacional (sócio)</div>
          <div className={`mt-1 font-mono font-semibold text-lg ${totalPF < 0 ? "text-destructive" : ""}`}>R$ {totalPF.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Banco virtual interno</div>
          <div className={`mt-1 font-mono font-semibold text-lg ${totalVI < 0 ? "text-destructive" : ""}`}>R$ {totalVI.toFixed(2)}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Conta</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma conta cadastrada.</TableCell></TableRow>
              ) : items.map((c) => {
                const saldo = saldos.get(c.id)?.saldo || 0;
                const nat = naturezaOf(c);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.nome}{c.ultimos_4_digitos ? <span className="text-xs text-muted-foreground"> •••{c.ultimos_4_digitos}</span> : null}</TableCell>
                    <TableCell>{c.instituicao || c.banco || "—"}</TableCell>
                    <TableCell><span className="text-xs uppercase text-muted-foreground">{(c.tipo_conta || c.tipo || "").replace(/_/g, " ")}</span></TableCell>
                    <TableCell><span className={`text-[10px] px-1.5 py-0.5 rounded border ${NAT_CLS[nat]}`}>{NAT_LABEL[nat]}</span></TableCell>
                    <TableCell>{lojaNome(c.loja_id)}</TableCell>
                    <TableCell className={`text-right font-mono ${saldo < 0 ? "text-destructive" : ""}`}>R$ {saldo.toFixed(2)}</TableCell>
                    <TableCell><StatusBadge ativo={c.ativo} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: c })}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "edit", record: c })}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(c)} title={c.ativo === false ? "Ativar" : "Inativar"}><Power className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setExcluir({ open: true, conta: c })} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
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
      <ExcluirContaBancariaDialog
        open={excluir.open} conta={excluir.conta}
        onClose={() => setExcluir({ open: false, conta: null })} onDeleted={load}
      />
    </PageShell>
  );
}