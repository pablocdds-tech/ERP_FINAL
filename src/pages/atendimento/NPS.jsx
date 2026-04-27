import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/atendimento/PageShell";
import { calcularNPS } from "@/lib/atendimento-service";

export default function NPS() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  useEffect(() => { base44.entities.Avaliacao.list().then(setAvaliacoes); }, []);

  const filtrados = avaliacoes.filter((a) => {
    if (de && a.data && a.data < de) return false;
    if (ate && a.data && a.data > ate) return false;
    return true;
  });

  const r = calcularNPS(filtrados);
  const pct = (n) => r.total > 0 ? ((n / r.total) * 100).toFixed(1) : "0,0";
  const cor = r.nps >= 75 ? "text-emerald-600" : r.nps >= 50 ? "text-blue-600" : r.nps >= 0 ? "text-amber-600" : "text-red-600";
  const classificacao = r.nps >= 75 ? "Excelência" : r.nps >= 50 ? "Qualidade" : r.nps >= 0 ? "Aperfeiçoamento" : "Crítica";

  return (
    <PageShell title="NPS — Net Promoter Score" description="Indicador de satisfação calculado a partir das avaliações com nota NPS (0-10).">
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground mb-1">De</div>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Até</div>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card className="p-6 col-span-1 md:col-span-3 text-center">
          <div className="text-xs text-muted-foreground">NPS atual</div>
          <div className={`text-6xl font-bold mt-2 ${cor}`}>{r.nps.toFixed(0)}</div>
          <div className={`text-sm font-medium mt-1 ${cor}`}>{classificacao}</div>
          <div className="text-xs text-muted-foreground mt-3">Calculado sobre {r.total} resposta(s)</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Promotores (9-10)</div>
          <div className="text-3xl font-semibold text-emerald-600 mt-1">{r.promotores}</div>
          <div className="text-xs text-muted-foreground mt-1">{pct(r.promotores)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Neutros (7-8)</div>
          <div className="text-3xl font-semibold text-amber-600 mt-1">{r.neutros}</div>
          <div className="text-xs text-muted-foreground mt-1">{pct(r.neutros)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Detratores (0-6)</div>
          <div className="text-3xl font-semibold text-red-600 mt-1">{r.detratores}</div>
          <div className="text-xs text-muted-foreground mt-1">{pct(r.detratores)}%</div>
        </Card>
      </div>

      <Card className="p-4 text-xs text-muted-foreground">
        <p><b>Como ler:</b> NPS = % Promotores - % Detratores. Faixas: <b className="text-red-600">-100 a 0</b> Crítica, <b className="text-amber-600">0 a 50</b> Aperfeiçoamento, <b className="text-blue-600">50 a 75</b> Qualidade, <b className="text-emerald-600">75 a 100</b> Excelência.</p>
      </Card>
    </PageShell>
  );
}