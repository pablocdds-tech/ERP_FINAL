import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import DRELinha from "@/components/gestao/DRELinha";
import IndicadorCard from "@/components/gestao/IndicadorCard";
import ReceitaPorCanal from "@/components/gestao/ReceitaPorCanal";
import {
  carregarBaseGestao,
  calcularDREExpandido,
  periodoAnterior,
  GRUPOS_DRE,
} from "@/lib/gestao-service";

export default function DRE() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);

  const calculos = useMemo(() => {
    if (!base) return null;
    const atual = calcularDREExpandido({ base, lojaId, de, ate });
    const ant = periodoAnterior(de, ate);
    const anterior = calcularDREExpandido({ base, lojaId, de: ant.de, ate: ant.ate });
    return { atual, anterior, periodoAnt: ant };
  }, [base, lojaId, de, ate]);

  if (!base || !calculos) {
    return <PageShell title="DRE Gerencial" description="Carregando..."><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;
  }

  const { atual: d, anterior: a, periodoAnt } = calculos;
  const pct = (v) => d.receita > 0 ? `${((v / d.receita) * 100).toFixed(1)}%` : "0%";

  // Status dos indicadores (benchmarks de food service)
  const statusCMV = d.cmvPct === 0 ? undefined : d.cmvPct <= 32 ? "bom" : d.cmvPct <= 38 ? "atencao" : "ruim";
  const statusFolha = d.receita > 0 && d.folha > 0
    ? (d.folha / d.receita) * 100 <= 28 ? "bom" : (d.folha / d.receita) * 100 <= 35 ? "atencao" : "ruim"
    : undefined;
  const statusPrime = d.primeCostPct === 0 ? undefined : d.primeCostPct <= 60 ? "bom" : d.primeCostPct <= 65 ? "atencao" : "ruim";
  const statusEbitda = d.receita === 0 ? undefined : d.ebitdaMargemCompetencia >= 15 ? "bom" : d.ebitdaMargemCompetencia >= 5 ? "atencao" : "ruim";
  const statusResultado = d.receita === 0 ? undefined : d.margemLiquidaCompetencia >= 10 ? "bom" : d.margemLiquidaCompetencia >= 0 ? "atencao" : "ruim";

  return (
    <PageShell
      title="DRE Gerencial"
      description="Demonstração de resultados gerencial — não contábil. Banco Virtual e movimentações internas estão excluídos."
    >
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      {/* Indicadores chave */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <IndicadorCard titulo="Receita Bruta" valor={d.receita} sufixo="$" descricao={`Período anterior: R$ ${(a.receita || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
        <IndicadorCard titulo="CMV" valor={d.cmvPct} sufixo="%" alvo="≤ 32%" status={statusCMV} />
        <IndicadorCard titulo="Prime Cost (CMV + Folha)" valor={d.primeCostPct} sufixo="%" alvo="≤ 60%" status={statusPrime} descricao="Indicador-chave de food service" />
        <IndicadorCard titulo="EBITDA (competência)" valor={d.ebitdaMargemCompetencia} sufixo="%" alvo="≥ 15%" status={statusEbitda} />
        <IndicadorCard titulo="Resultado Líquido" valor={d.margemLiquidaCompetencia} sufixo="%" alvo="≥ 10%" status={statusResultado} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DRE expandido */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-base font-semibold">Demonstração de Resultados</div>
              <div className="text-xs text-muted-foreground">{de} até {ate} • Comparativo: {periodoAnt.de} até {periodoAnt.ate}</div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
            <span>Conta</span>
            <span className="flex gap-3">
              <span className="w-14 text-right">% rec</span>
              <span className="w-32 text-right">Pago / Realizado</span>
              <span className="w-32 text-right">A Vencer</span>
              <span className="w-20 text-right">vs Anterior</span>
            </span>
          </div>

          <DRELinha label="Receita Bruta de Vendas" valor={d.receita} pct="100%" anterior={a.receita} bold />
          <DRELinha label="(–) Taxas de canais e operadoras" valor={-d.taxas} pct={pct(-d.taxas)} anterior={-a.taxas} indent={1} neg separador />
          <DRELinha label="(–) Impostos sobre vendas" valor={-d.impostosPago} valorVencer={d.impostosVencer ? -d.impostosVencer : undefined} pct={pct(-(d.impostosPago + d.impostosVencer))} anterior={-(a.impostosPago + a.impostosVencer)} indent={1} neg separador />
          <DRELinha label="Receita Líquida" valor={d.receitaLiquida} pct={pct(d.receitaLiquida)} anterior={a.receitaLiquida} bold top />

          <DRELinha label="(–) CMV — Custo da Mercadoria Vendida" valor={-d.cmv} pct={pct(-d.cmv)} anterior={-a.cmv} indent={1} neg separador hint="estimado" />
          <DRELinha label="Lucro Bruto" valor={d.lucroBruto} pct={pct(d.lucroBruto)} anterior={a.lucroBruto} bold top />

          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-4 mb-1 pt-3 border-t-2 border-foreground/30">
            Despesas Operacionais
          </div>

          {GRUPOS_DRE.filter((g) => !["impostos", "financeiras"].includes(g.chave)).map((g) => {
            const grupoAtual = d.grupos[g.chave] || { pago: 0, vencer: 0 };
            const grupoAnt = a.grupos[g.chave] || { pago: 0, vencer: 0 };
            const total = grupoAtual.pago + grupoAtual.vencer;
            if (total === 0 && (grupoAnt.pago + grupoAnt.vencer) === 0) return null;
            return (
              <DRELinha
                key={g.chave}
                label={`(–) ${g.label}`}
                valor={-grupoAtual.pago}
                valorVencer={grupoAtual.vencer ? -grupoAtual.vencer : undefined}
                pct={pct(-total)}
                anterior={-(grupoAnt.pago + grupoAnt.vencer)}
                indent={1}
                neg
                separador
              />
            );
          })}

          <DRELinha
            label="EBITDA"
            valor={d.ebitdaPago}
            valorVencer={d.ebitdaCompetencia !== d.ebitdaPago ? d.ebitdaCompetencia : undefined}
            pct={pct(d.ebitdaCompetencia)}
            anterior={a.ebitdaCompetencia}
            bold
            top
            hint="lucro antes de financeiras"
          />

          <DRELinha
            label="(–) Despesas Financeiras (juros, taxas bancárias)"
            valor={-d.financeirasPago}
            valorVencer={d.financeirasVencer ? -d.financeirasVencer : undefined}
            pct={pct(-(d.financeirasPago + d.financeirasVencer))}
            anterior={-(a.financeirasPago + a.financeirasVencer)}
            indent={1}
            neg
            separador
          />

          <DRELinha
            label="Resultado do Período"
            valor={d.resultadoPago}
            valorVencer={d.resultadoCompetencia !== d.resultadoPago ? d.resultadoCompetencia : undefined}
            pct={pct(d.resultadoCompetencia)}
            anterior={a.resultadoCompetencia}
            bold
            neg={d.resultadoCompetencia < 0}
            top
          />

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            ℹ️ Coluna <strong>Pago/Realizado</strong> = regime de caixa (efetivamente pago). Coluna <strong>A Vencer</strong> = competência (vence no período mas ainda não pago).
            Classifique suas categorias em <em>Cadastros → Categorias Financeiras → Grupo no DRE</em> para que apareçam corretamente agrupadas aqui.
          </p>
        </Card>

        {/* Sidebar: Receita por canal + indicadores extras */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-base font-semibold mb-3">Receita por Canal</div>
            <ReceitaPorCanal canais={d.canais} receita={d.receita} />
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-base font-semibold">Ponto de Equilíbrio</div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">
                R$ {d.pontoEquilibrio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Receita mínima no período para zerar resultado
              </div>
            </div>
            <div className="text-sm space-y-1 pt-2 border-t">
              <div className="flex justify-between"><span className="text-muted-foreground">Margem de contribuição</span><span className="tabular-nums">{d.margemContribuicaoPct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Receita realizada</span><span className="tabular-nums">R$ {d.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-medium">
                <span>Distância do PE</span>
                <span className={`tabular-nums ${d.receita >= d.pontoEquilibrio ? "text-emerald-700" : "text-red-700"}`}>
                  {d.receita >= d.pontoEquilibrio ? "✓ acima" : "abaixo"} R$ {Math.abs(d.receita - d.pontoEquilibrio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-base font-semibold mb-3">Comparativo</div>
            <div className="text-sm space-y-2">
              <ComparativoRow label="Receita" atual={d.receita} anterior={a.receita} />
              <ComparativoRow label="Lucro Bruto" atual={d.lucroBruto} anterior={a.lucroBruto} />
              <ComparativoRow label="EBITDA" atual={d.ebitdaCompetencia} anterior={a.ebitdaCompetencia} />
              <ComparativoRow label="Resultado" atual={d.resultadoCompetencia} anterior={a.resultadoCompetencia} />
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function ComparativoRow({ label, atual, anterior }) {
  const dif = (Number(atual) || 0) - (Number(anterior) || 0);
  const pctVar = anterior !== 0 ? (dif / Math.abs(anterior)) * 100 : 0;
  const positivo = dif >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums text-xs ${positivo ? "text-emerald-700" : "text-red-700"}`}>
        {positivo ? "▲" : "▼"} {pctVar.toFixed(1)}% ({positivo ? "+" : ""}R$ {dif.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
      </span>
    </div>
  );
}