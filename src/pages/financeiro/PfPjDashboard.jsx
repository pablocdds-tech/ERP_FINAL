import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Users, ArrowDownLeft, Plus, FileText } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import PfPjStatCard from "@/components/financeiro/PfPjStatCard";
import PfPjAlertas from "@/components/financeiro/PfPjAlertas";
import { calcularSaldosBancarios, aplicarVencimento } from "@/lib/financeiro-service";
import { calcularSaldoSocio, totaisSemana } from "@/lib/socio-empresa-service";

const inDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr); const hoje = new Date();
  const diff = (d - hoje) / 86400000;
  return diff >= -1 && diff <= days;
};

export default function PfPjDashboard() {
  const [contas, setContas] = useState([]);
  const [movs, setMovs] = useState([]);
  const [movsSocio, setMovsSocio] = useState([]);
  const [pagar, setPagar] = useState([]);
  const [receber, setReceber] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cb, mb, ms, cp, cr] = await Promise.all([
        base44.entities.ContaBancaria.list(),
        base44.entities.MovimentacaoBancaria.list("-data", 2000),
        base44.entities.MovimentoSocio.list("-data", 1000),
        base44.entities.ContaPagar.list("data_vencimento", 1000),
        base44.entities.ContaReceber.list("data_vencimento", 1000),
      ]);
      setContas(cb); setMovs(mb); setMovsSocio(ms);
      setPagar(aplicarVencimento(cp)); setReceber(aplicarVencimento(cr));
      setLoading(false);
    })();
  }, []);

  const saldosMap = useMemo(() => calcularSaldosBancarios(contas, movs), [contas, movs]);
  const contasComSaldo = useMemo(() => contas.map((c) => ({ ...c, _saldo: saldosMap.get(c.id)?.saldo || 0 })), [contas, saldosMap]);

  const naturezaOf = (c) => c.natureza || (c.tipo === "cartao_pf" || c.tipo === "cheque_especial_pf" ? "PF_USO_OPERACIONAL" : "PJ");
  const caixaPj = contasComSaldo.filter((c) => naturezaOf(c) === "PJ").reduce((s, c) => s + c._saldo, 0);
  const caixaPf = contasComSaldo.filter((c) => naturezaOf(c) === "PF_USO_OPERACIONAL").reduce((s, c) => s + c._saldo, 0);

  const aPagar7 = pagar.filter((d) => ["aberta", "vencida", "parcial"].includes(d.status) && inDays(d.data_vencimento, 7))
    .reduce((s, d) => s + (Number(d.valor) || 0) - (Number(d.valor_pago) || 0), 0);
  const aReceber7 = receber.filter((d) => ["aberta", "vencida", "parcial"].includes(d.status) && inDays(d.data_vencimento, 7))
    .reduce((s, d) => s + (Number(d.valor) || 0) - (Number(d.valor_recebido) || 0), 0);

  const saldoSocio = calcularSaldoSocio(movsSocio);
  const semana = totaisSemana(movsSocio);

  const retiradasMes = useMemo(() => {
    const hoje = new Date();
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return movsSocio
      .filter((m) => m.tipo_movimento === "retirada_socio" && m.status !== "cancelado" && new Date(m.data) >= ini)
      .reduce((s, m) => s + (Number(m.valor) || 0), 0);
  }, [movsSocio]);

  return (
    <PageShell
      title="Transição PF x PJ"
      description="Painel para organizar a mistura entre finanças pessoais do sócio e a empresa, sem exigir separação radical imediata."
      actions={
        <div className="flex gap-2">
          <Link to="/admin/financeiro/real/pf-pj-lancamento"><Button><Plus className="w-4 h-4 mr-1.5" /> Lançamento rápido</Button></Link>
          <Link to="/admin/financeiro/real/pf-pj-resumo"><Button variant="outline"><FileText className="w-4 h-4 mr-1.5" /> Resumo semanal</Button></Link>
        </div>
      }
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <PfPjStatCard label="Caixa real disponível (PJ)" value={caixaPj} hint={`PF: R$ ${caixaPf.toFixed(2)}`} icon={Wallet} tone={caixaPj < 0 ? "negative" : "positive"} />
            <PfPjStatCard label="A pagar (7 dias)" value={aPagar7} icon={ArrowUpCircle} tone={aPagar7 > 0 ? "warning" : "default"} />
            <PfPjStatCard label="A receber (7 dias)" value={aReceber7} icon={ArrowDownCircle} tone="positive" />
            <PfPjStatCard label="Saldo Sócio x Empresa" value={saldoSocio} hint={saldoSocio >= 0 ? "Empresa deve ao sócio" : "Sócio deve à empresa"} icon={Users} tone={saldoSocio >= 0 ? "positive" : "negative"} />
            <PfPjStatCard label="Retiradas do sócio (mês)" value={retiradasMes} icon={ArrowDownLeft} tone="warning" />
          </div>

          <div className="mb-3">
            <h3 className="text-sm font-semibold mb-2">Alertas</h3>
            <PfPjAlertas contas={contasComSaldo} movimentos={movsSocio} semana={semana} />
          </div>
        </>
      )}
    </PageShell>
  );
}