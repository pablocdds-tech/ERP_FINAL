import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Wallet, AlertTriangle, RefreshCw, ArrowDownLeft, Send, FileSearch } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import MovimentoSocioDialog from "@/components/financeiro/MovimentoSocioDialog";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ROTULO_TIPO } from "@/lib/socio-empresa-service";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const BOTOES = [
  { tipo: "despesa_empresa_paga_pf", icon: ArrowUp, color: "text-rose-600 border-rose-200 hover:bg-rose-50" },
  { tipo: "despesa_pessoal_paga_empresa", icon: AlertTriangle, color: "text-amber-700 border-amber-200 hover:bg-amber-50" },
  { tipo: "recebimento_empresa_em_pf", icon: ArrowDown, color: "text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  { tipo: "uso_cheque_especial_pf", icon: Wallet, color: "text-rose-600 border-rose-200 hover:bg-rose-50" },
  { tipo: "reembolso_socio", icon: RefreshCw, color: "text-blue-700 border-blue-200 hover:bg-blue-50" },
  { tipo: "retirada_socio", icon: ArrowDownLeft, color: "text-amber-700 border-amber-200 hover:bg-amber-50" },
  { tipo: "devolucao_socio", icon: Send, color: "text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
];

export default function PfPjLancamento() {
  const [tipo, setTipo] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const ms = await base44.entities.MovimentoSocio.list("-data", 100);
    setMovimentos(ms); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <PageShell
      title="Lançamento Rápido PF x PJ"
      description="Registre em segundos qualquer movimento entre você e a empresa."
      actions={<Link to="/admin/financeiro/real/pf-pj"><Button variant="outline"><FileSearch className="w-4 h-4 mr-1.5" /> Painel</Button></Link>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {BOTOES.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.tipo}
              onClick={() => setTipo(b.tipo)}
              className={`text-left rounded-lg border bg-card p-4 transition-colors ${b.color}`}
            >
              <Icon className="w-5 h-5 mb-2" />
              <div className="text-sm font-medium text-foreground">{ROTULO_TIPO[b.tipo]}</div>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-medium">Últimos lançamentos</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>DRE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Carregando…</TableCell></TableRow>
              ) : movimentos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Nenhum lançamento ainda.</TableCell></TableRow>
              ) : movimentos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.data ? format(new Date(m.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-xs">{ROTULO_TIPO[m.tipo] || m.tipo}</TableCell>
                  <TableCell className="text-sm">{m.descricao || "—"}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(m.valor || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{m.afeta_dre ? "Sim" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MovimentoSocioDialog
        open={!!tipo}
        tipo={tipo}
        onClose={() => setTipo(null)}
        onSaved={load}
      />
    </PageShell>
  );
}