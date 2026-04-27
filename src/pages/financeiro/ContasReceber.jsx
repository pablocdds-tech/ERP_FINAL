import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import ContasDocumentoTable from "@/components/financeiro/ContasDocumentoTable";
import ContaDocumentoDialog from "@/components/financeiro/ContaDocumentoDialog";
import BaixaDialog from "@/components/financeiro/BaixaDialog.jsx";
import { aplicarVencimento } from "@/lib/financeiro-service";

export default function ContasReceber() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });
  const [baixa, setBaixa] = useState({ open: false, record: null });

  const load = async () => {
    const [c, l] = await Promise.all([
      base44.entities.ContaReceber.list("data_vencimento", 500),
      base44.entities.Loja.list(),
    ]);
    setItems(aplicarVencimento(c)); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((d) => {
    if (statusFilter !== "todos" && d.status !== statusFilter) return false;
    if (lojaFilter !== "todas" && d.loja_id !== lojaFilter) return false;
    if (search && ![d.descricao, d.cliente, d.documento].some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [items, search, statusFilter, lojaFilter]);

  const totalAberto = filtered.filter((d) => d.status === "aberta" || d.status === "vencida" || d.status === "parcial")
    .reduce((s, d) => s + (Number(d.valor) || 0) - (Number(d.valor_recebido) || 0), 0);

  return (
    <PageShell
      title="Contas a Receber"
      description="Recebimentos previstos. Baixe ao confirmar a entrada na conta."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova conta a receber
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="parcial">Parciais</SelectItem>
              <SelectItem value="recebida">Recebidas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
          <span className="text-muted-foreground">A receber (em aberto)</span>
          <span className="font-mono font-semibold">R$ {totalAberto.toFixed(2)}</span>
        </div>
      </Card>

      <ContasDocumentoTable
        items={filtered}
        lojas={lojas}
        isPagar={false}
        onView={(d) => setDialog({ open: true, mode: "view", record: d })}
        onEdit={(d) => setDialog({ open: true, mode: "edit", record: d })}
        onBaixar={(d) => setBaixa({ open: true, record: d })}
      />

      <ContaDocumentoDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        documento_tipo="conta_receber"
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />

      <BaixaDialog
        open={baixa.open}
        documento={baixa.record}
        documento_tipo="conta_receber"
        onClose={() => setBaixa({ open: false, record: null })}
        onSaved={load}
      />
    </PageShell>
  );
}