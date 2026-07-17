import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import { Loader2 } from "lucide-react";

import DashboardFiltros from "@/components/dashboard/DashboardFiltros";
import AlertasCriticos from "@/components/dashboard/AlertasCriticos";
import AcoesRapidas from "@/components/dashboard/AcoesRapidas";
import BlocoExecutivo from "@/components/dashboard/BlocoExecutivo";
import BlocoVendas from "@/components/dashboard/BlocoVendas";
import BlocoFinanceiro from "@/components/dashboard/BlocoFinanceiro";

import {
  carregarDashboard, resolverPeriodo, periodoAnterior,
  calcularVendas, calcularCaixa, calcularContasPeriodo,
  calcularDREResumido, gerarAlertas,
} from "@/lib/dashboard-service";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(true);

  const [lojaId, setLojaId] = useState(null);
  const [periodo, setPeriodo] = useState("mes_atual");
  const [custom, setCustom] = useState({ de: "", ate: "" });
  const [visao, setVisao] = useState("consolidado");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    carregarDashboard().then((b) => { setBase(b); setLoading(false); });
  }, []);

  const { de, ate } = useMemo(() => resolverPeriodo(periodo, custom), [periodo, custom]);
  const ant = useMemo(() => periodoAnterior(de, ate), [de, ate]);

  const dados = useMemo(() => {
    if (!base) return null;
    const vendas = calcularVendas(base, lojaId, de, ate);
    const vendasAnt = calcularVendas(base, lojaId, ant.de, ant.ate);
    const hoje = new Date().toISOString().slice(0, 10);
    const ontem = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    const vendasHoje = calcularVendas(base, lojaId, hoje, hoje).total;
    const vendasOntem = calcularVendas(base, lojaId, ontem, ontem).total;
    const caixa = calcularCaixa(base, lojaId);
    const contas = calcularContasPeriodo(base, lojaId);
    const dre = calcularDREResumido(base, lojaId, de, ate);
    const alertas = gerarAlertas(base, lojaId, de, ate);
    const fechamentosPendentes = (lojaId ? base.lojas.filter((l) => l.id === lojaId) : base.lojas.filter((l) => l.tipo !== "cd"))
      .filter((l) => !base.fechamentos.some((f) => f.loja_id === l.id && f.data === hoje)).length;
    const divergentes = base.fechamentos.filter((f) => f.data >= de && f.data <= ate && Math.abs(Number(f.diferenca_caixa) || 0) > 5).length;
    const movs = base.movBancarias.slice(0, 10);
    return { vendas, vendasAnt, vendasHoje, vendasOntem, caixa, contas, dre, alertas, fechamentosPendentes, divergentes, movs };
  }, [base, lojaId, de, ate, ant.de, ant.ate]);

  if (loading || !base || !dados) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Carregando dashboard...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Olá${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={`Visão executiva — ${new Date(de + "T00:00:00").toLocaleDateString("pt-BR")} a ${new Date(ate + "T00:00:00").toLocaleDateString("pt-BR")}`}
      />

      <DashboardFiltros
        lojas={base.lojas}
        lojaId={lojaId} onLojaChange={setLojaId}
        periodo={periodo} onPeriodoChange={setPeriodo}
        custom={custom} onCustomChange={setCustom}
        visao={visao} onVisaoChange={setVisao}
      />

      <AlertasCriticos alertas={dados.alertas} />
      <AcoesRapidas />

      <BlocoExecutivo
        vendas={dados.vendas} vendasAnt={dados.vendasAnt}
        caixa={dados.caixa} contas={dados.contas} dre={dados.dre}
      />

      <BlocoVendas
        vendas={dados.vendas} vendasHoje={dados.vendasHoje} vendasOntem={dados.vendasOntem}
        lojas={base.lojas} fechamentosPendentes={dados.fechamentosPendentes} divergentes={dados.divergentes}
      />

      <BlocoFinanceiro caixa={dados.caixa} contas={dados.contas} movs={dados.movs} />
    </div>
  );
}