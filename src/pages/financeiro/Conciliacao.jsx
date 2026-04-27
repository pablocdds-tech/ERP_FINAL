import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Search } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import { format } from "date-fns";

export default function Conciliacao() {
  const [movs, setMovs] = useState([]);
  const [contas, setContas] = useState([]);
  const [contaFilter, setContaFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("nao_conciliadas");
  const [search, setSearch] = useState("");

  const load = async () => {
    const [m, c] = await Promise.all([
      base44.entities.MovimentacaoBancaria.list("-data", 2000),
      base44.entities.ContaBancaria.list(),
    ]);
    setMovs(m); setContas(c);
  };
  useEffect(() => { load(); }, []);

  const contaNome = (id) => contas.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() => movs.filter((m) => {
    if (contaFilter !== "todas" && m.conta_bancaria_id !== contaFilter) return false;
    if (statusFilter === "nao_conciliadas" && m.conciliada) return false;
    if (statusFilter === "conciliadas" && !m.conciliada) return false;
    if (search && !`${m.descricao || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [movs, contaFilter, statusFilter, search]);

  const toggle = async (m) => {
    await base44.entities.MovimentacaoBancaria.update(m.id, { conciliada: !m.conciliada });
    load();
  };

  const totalNaoConc = movs.filter((m) => !m.conciliada && (contaFilter === "todas" || m.conta_bancaria_id === contaFilter)).length;

  return (
    <PageShell title="Conciliação Bancária" description="Marque movimentações como conferidas com o extrato real.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={contaFilter} onValueChange={setContaFilter}>
            <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as contas</SelectItem>
              {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nao_conciliadas">Não conciliadas</SelectItem>
              <SelectItem value="conciliadas">Conciliadas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Pendentes de conciliação
          </span>
          <span className="font-semibold">{totalNaoConc}</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">OK</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Sem movimentações.</TableCell></TableRow>
              ) : filtered.map((m) => {
                const positivo = ["credito", "transferencia_entrada", "saldo_inicial"].includes(m.tipo);
                return (
                  <TableRow key={m.id} className={`hover:bg-muted/30 ${m.conciliada ? "bg-emerald-50/30" : ""}`}>
                    <TableCell><Checkbox checked={!!m.conciliada} onCheckedChange={() => toggle(m)} /></TableCell>
                    <TableCell>{m.data ? format(new Date(m.data), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{contaNome(m.conta_bancaria_id)}</TableCell>
                    <TableCell className="font-medium">{m.descricao || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-[10px] uppercase">{m.origem_tipo || "—"}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${positivo ? "text-emerald-700" : "text-destructive"}`}>
                      {positivo ? "+" : "−"} R$ {Number(m.valor || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}