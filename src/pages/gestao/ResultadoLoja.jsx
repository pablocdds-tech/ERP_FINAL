import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/gestao/PageShell";
import FiltrosPeriodo from "@/components/gestao/FiltrosPeriodo";
import StatCard from "@/components/gestao/StatCard";
import { carregarBaseGestao, calcularDRE } from "@/lib/gestao-service";

export default function ResultadoLoja() {
  const [base, setBase] = useState(null);
  const [lojaId, setLojaId] = useState("");
  const hoje = new Date().toISOString().slice(0, 10);
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [de, setDe] = useState(ini.toISOString().slice(0, 10));
  const [ate, setAte] = useState(hoje);

  useEffect(() => {
    carregarBaseGestao().then((b) => {
      setBase(b);
      if (b.lojas[0]) setLojaId(b.lojas[0].id);
    });
  }, []);

  if (!base) return <PageShell title="Resultado por Loja"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const d = calcularDRE({ base, lojaId, de, ate });
  const loja = base.lojas.find((l) => l.id === lojaId);

  return (
    <PageShell title="Resultado por Loja" description="DRE individual da loja selecionada.">
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Loja</div>
          <Select value={lojaId} onValueChange={setLojaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {base.lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <FiltrosPeriodo lojas={base.lojas} lojaId={lojaId} setLojaId={setLojaId} de={de} setDe={setDe} ate={ate} setAte={setAte} mostrarLoja={false} />

      {!loja ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Selecione uma loja.</Card>
      ) : (
        <>
          <div className="text-sm font-medium mb-3">{loja.nome}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard label="Receita" value={`R$ ${d.receita.toFixed(2)}`} tone="info" />
            <StatCard label="CMV" value={`R$ ${d.cmv.toFixed(2)}`} sub={`${d.cmvPct.toFixed(1)}%`} />
            <StatCard label="Despesas" value={`R$ ${d.despesas.toFixed(2)}`} />
            <StatCard label="Resultado"
              value={`R$ ${d.resultado.toFixed(2)}`}
              sub={`Margem ${d.margemLiquida.toFixed(1)}%`}
              tone={d.resultado >= 0 ? "positive" : "negative"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Lucro bruto" value={`R$ ${d.lucroBruto.toFixed(2)}`} sub={`${d.margemBruta.toFixed(1)}%`} />
            <StatCard label="Taxas (canais)" value={`R$ ${d.taxas.toFixed(2)}`} />
            <StatCard label="CMV %" value={`${d.cmvPct.toFixed(1)}%`} tone={d.cmvPct > 35 ? "warn" : "default"} />
          </div>
        </>
      )}
    </PageShell>
  );
}