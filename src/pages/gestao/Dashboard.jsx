import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Percent, AlertTriangle, ArrowRight } from "lucide-react";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, calcularDRE, gerarAlertas } from "@/lib/gestao-service";

export default function Dashboard() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);

  if (!base) return <PageShell title="Dashboard Geral" description="Carregando..."><Card className="p-8 text-center text-sm">Carregando indicadores...</Card></PageShell>;

  const dre = calcularDRE({ base, lojaId, de, ate });
  const alertas = gerarAlertas(base);
  const ticketMedio = dre.receita / Math.max(1, base.fechamentos.filter((f) => (!lojaId || f.loja_id === lojaId) && f.data >= de && f.data <= ate).length || 1);

  return (
    <PageShell title="Dashboard Geral" description="Visão executiva — receita, CMV, despesas e resultado.">
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Receita" value={`R$ ${dre.receita.toFixed(2)}`} icon={DollarSign} tone="info" />
        <StatCard label="CMV" value={`R$ ${dre.cmv.toFixed(2)}`} sub={`${dre.cmvPct.toFixed(1)}%`} icon={ShoppingBag} />
        <StatCard label="Despesas" value={`R$ ${dre.despesas.toFixed(2)}`} sub="Reais (sem Banco Virtual)" />
        <StatCard label="Resultado"
          value={`R$ ${dre.resultado.toFixed(2)}`}
          sub={`Margem ${dre.margemLiquida.toFixed(1)}%`}
          tone={dre.resultado >= 0 ? "positive" : "negative"}
          icon={dre.resultado >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Lucro bruto" value={`R$ ${dre.lucroBruto.toFixed(2)}`} sub={`Margem ${dre.margemBruta.toFixed(1)}%`} icon={Percent} />
        <StatCard label="Taxas" value={`R$ ${dre.taxas.toFixed(2)}`} />
        <StatCard label="Ticket médio (dia)" value={`R$ ${ticketMedio.toFixed(2)}`} />
        <StatCard label="Alertas" value={alertas.length} tone={alertas.length > 0 ? "warn" : "default"} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Atalhos rápidos</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: "DRE", to: "/gestao/dre" },
              { l: "CMV", to: "/gestao/cmv" },
              { l: "Margem", to: "/gestao/margem" },
              { l: "Por loja", to: "/gestao/resultado-loja" },
              { l: "Comparativo", to: "/gestao/comparativo" },
              { l: "Alertas", to: "/gestao/alertas" },
            ].map((a) => (
              <Link key={a.to} to={a.to}>
                <Card className="p-3 text-sm hover:border-foreground/30 flex items-center justify-between">
                  {a.l} <ArrowRight className="w-3 h-3" />
                </Card>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-medium mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas principais</div>
          {alertas.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tudo em ordem ✅</div>
          ) : (
            <div className="space-y-2">
              {alertas.slice(0, 5).map((a, i) => (
                <Link key={i} to={a.link || "#"}>
                  <div className="p-2 rounded border text-sm hover:bg-muted">
                    <div className="font-medium">{a.titulo}</div>
                    <div className="text-xs text-muted-foreground">{a.detalhe}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}