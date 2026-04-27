import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import { carregarBaseGestao, calcularDRE } from "@/lib/gestao-service";

const fmt = (v) => `R$ ${(Number(v) || 0).toFixed(2)}`;

function Linha({ label, valor, pct, bold, neg, indent = 0, top, separador }) {
  const cls = neg ? "text-red-600" : "";
  return (
    <div className={`flex items-center justify-between py-2 ${separador ? "border-t" : ""} ${top ? "border-t-2" : ""}`}>
      <div style={{ paddingLeft: indent * 16 }} className={`text-sm ${bold ? "font-semibold" : ""} ${cls}`}>{label}</div>
      <div className="flex items-center gap-3">
        {pct !== undefined && <span className="text-xs text-muted-foreground w-14 text-right">{pct}</span>}
        <div className={`text-sm tabular-nums ${bold ? "font-semibold" : ""} ${cls} w-32 text-right`}>{fmt(valor)}</div>
      </div>
    </div>
  );
}

export default function DRE() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);

  if (!base) return <PageShell title="DRE Gerencial" description="Carregando..."><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const d = calcularDRE({ base, lojaId, de, ate });
  const pct = (v) => d.receita > 0 ? `${((v / d.receita) * 100).toFixed(1)}%` : "0%";

  return (
    <PageShell title="DRE Gerencial" description="Demonstração de resultados gerencial — não contábil. Banco Virtual não entra em receita.">
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} />

      <Card className="p-5 max-w-3xl">
        <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
          <span>Conta</span><span className="flex gap-3"><span className="w-14 text-right">% rec</span><span className="w-32 text-right">Valor</span></span>
        </div>
        <Linha label="Receita Bruta de Vendas" valor={d.receita} pct="100%" bold />
        <Linha label="(–) Taxas de canais e operadoras" valor={-d.taxas} pct={pct(-d.taxas)} indent={1} neg separador />
        <Linha label="Receita Líquida" valor={d.receita - d.taxas} pct={pct(d.receita - d.taxas)} bold top />
        <Linha label="(–) CMV — Custo da Mercadoria Vendida" valor={-d.cmv} pct={pct(-d.cmv)} indent={1} neg separador />
        <Linha label="Lucro Bruto" valor={d.lucroBruto} pct={pct(d.lucroBruto)} bold top />
        <Linha label="(–) Despesas operacionais (reais pagas)" valor={-d.despesas} pct={pct(-d.despesas)} indent={1} neg separador />
        <Linha label="Resultado do Período" valor={d.resultado} pct={pct(d.resultado)} bold neg={d.resultado < 0} top />
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded bg-muted">
            <div className="text-xs text-muted-foreground">Margem Bruta</div>
            <div className="font-semibold">{d.margemBruta.toFixed(1)}%</div>
          </div>
          <div className={`p-3 rounded ${d.margemLiquida >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <div className="text-xs text-muted-foreground">Margem Líquida</div>
            <div className={`font-semibold ${d.margemLiquida >= 0 ? "text-emerald-700" : "text-red-700"}`}>{d.margemLiquida.toFixed(1)}%</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ℹ️ DRE Gerencial — usa receita real dos fechamentos diários aprovados. Banco Virtual e movimentações internas estão excluídos.
        </p>
      </Card>
    </PageShell>
  );
}