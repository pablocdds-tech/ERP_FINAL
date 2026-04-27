import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import { carregarBaseGestao, calcularDRE } from "@/lib/gestao-service";

export default function Comparativo() {
  const [base, setBase] = useState(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Comparativo"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const dres = base.lojas.map((l) => ({ loja: l, ...calcularDRE({ base, lojaId: l.id, de, ate }) }));
  const maxRec = Math.max(1, ...dres.map((d) => d.receita));

  return (
    <PageShell title="Comparativo entre Lojas" description="Compare receita, CMV, despesas e margem de cada loja lado a lado.">
      <FiltrosPeriodo lojas={base.lojas} de={de} setDe={setDe} ate={ate} setAte={setAte} mostrarLoja={false} />

      {dres.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Sem lojas cadastradas.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dres.map((d) => {
            const pct = (d.receita / maxRec) * 100;
            return (
              <Card key={d.loja.id} className="p-4">
                <div className="font-medium mb-2">{d.loja.nome}</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Receita</span><span className="font-medium">R$ {d.receita.toFixed(2)}</span></div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">CMV</span><span>R$ {d.cmv.toFixed(2)} ({d.cmvPct.toFixed(1)}%)</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxas</span><span>R$ {d.taxas.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Despesas</span><span>R$ {d.despesas.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-medium">Resultado</span>
                    <span className={`font-semibold ${d.resultado < 0 ? "text-red-600" : "text-emerald-600"}`}>R$ {d.resultado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margem líquida</span>
                    <span className={d.margemLiquida < 0 ? "text-red-600" : ""}>{d.margemLiquida.toFixed(1)}%</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}