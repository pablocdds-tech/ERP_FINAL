import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { MODULES } from "@/lib/modules";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import DashboardFiltros from "@/components/dashboard/DashboardFiltros";
import AlertasCriticos from "@/components/dashboard/AlertasCriticos";
import AcoesRapidas from "@/components/dashboard/AcoesRapidas";
import BlocoExecutivo from "@/components/dashboard/BlocoExecutivo";
import BlocoVendas from "@/components/dashboard/BlocoVendas";
import BlocoFinanceiro from "@/components/dashboard/BlocoFinanceiro";
import BlocoSocioEmpresa from "@/components/dashboard/BlocoSocioEmpresa";
import BlocoBancoVirtual from "@/components/dashboard/BlocoBancoVirtual";
import BlocoOperacoes from "@/components/dashboard/BlocoOperacoes";
import BlocoRotinas from "@/components/dashboard/BlocoRotinas";
import BlocoRH from "@/components/dashboard/BlocoRH";
import BlocoMarketing from "@/components/dashboard/BlocoMarketing";
import BlocoAtendimento from "@/components/dashboard/BlocoAtendimento";
import BlocoDRE from "@/components/dashboard/BlocoDRE";

import {
  carregarDashboard, resolverPeriodo, periodoAnterior,
  calcularVendas, calcularCaixa, calcularContasPeriodo,
  calcularSocioEmpresa, calcularBancoVirtual, calcularOperacoes,
  calcularRotinas, calcularRH, calcularMarketing, calcularAtendimento,
  calcularDREResumido, gerarAlertas,
} from "@/lib/dashboard-service";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
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
    const se = calcularSocioEmpresa(base, lojaId, de, ate);
    const bv = calcularBancoVirtual(base);
    const op = calcularOperacoes(base, lojaId, de, ate);
    const rt = calcularRotinas(base, lojaId);
    const rh = calcularRH(base, lojaId);
    const mk = calcularMarketing(base, de, ate);
    const at = calcularAtendimento(base, lojaId, de, ate);
    const dre = calcularDREResumido(base, lojaId, de, ate);
    const alertas = gerarAlertas(base, lojaId, de, ate);
    const fechamentosPendentes = (lojaId ? base.lojas.filter((l) => l.id === lojaId) : base.lojas.filter((l) => l.tipo !== "cd"))
      .filter((l) => !base.fechamentos.some((f) => f.loja_id === l.id && f.data === hoje)).length;
    const divergentes = base.fechamentos.filter((f) => f.data >= de && f.data <= ate && Math.abs(Number(f.diferenca_caixa) || 0) > 5).length;
    const movs = base.movBancarias.slice(0, 10);
    return { vendas, vendasAnt, vendasHoje, vendasOntem, caixa, contas, se, bv, op, rt, rh, mk, at, dre, alertas, fechamentosPendentes, divergentes, movs };
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

      <BlocoSocioEmpresa se={dados.se} caixa={dados.caixa} />

      <BlocoBancoVirtual bv={dados.bv} lojas={base.lojas} />

      <BlocoOperacoes op={dados.op} />

      <BlocoRotinas rt={dados.rt} />

      <BlocoRH rh={dados.rh} />

      <BlocoMarketing mk={dados.mk} />

      <BlocoAtendimento at={dados.at} />

      <BlocoDRE dre={dados.dre} />

      <div className="mt-10 mb-3 flex items-end justify-between">
        <h2 className="text-base font-semibold">Módulos do sistema</h2>
        <span className="text-xs text-muted-foreground">{MODULES.length} áreas</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.id} to={m.path}>
              <Card className="p-5 h-full hover:border-foreground/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{m.nome}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.descricao}</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}