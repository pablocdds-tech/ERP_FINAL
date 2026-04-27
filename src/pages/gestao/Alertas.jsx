import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/gestao/PageShell";
import { carregarBaseGestao, gerarAlertas } from "@/lib/gestao-service";

const SEV = {
  critica: { cor: "bg-red-100 text-red-700 border-red-300", l: "Crítica" },
  alta: { cor: "bg-amber-100 text-amber-700 border-amber-300", l: "Alta" },
  media: { cor: "bg-blue-100 text-blue-700 border-blue-300", l: "Média" },
  baixa: { cor: "bg-slate-100 text-slate-700 border-slate-300", l: "Baixa" },
};

export default function Alertas() {
  const [base, setBase] = useState(null);
  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Alertas Inteligentes"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const alertas = gerarAlertas(base);

  return (
    <PageShell title="Alertas Inteligentes" description="Indicadores fora do padrão que precisam de atenção.">
      {alertas.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <div className="font-medium">Nenhum alerta no momento</div>
          <div className="text-xs text-muted-foreground mt-1">Tudo dentro dos padrões.</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const sev = SEV[a.severidade] || SEV.media;
            return (
              <Card key={i} className={`p-4 border-l-4 ${sev.cor.includes("red") ? "border-l-red-500" : sev.cor.includes("amber") ? "border-l-amber-500" : "border-l-blue-500"}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${sev.cor.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={sev.cor}>{sev.l}</Badge>
                      <div className="font-medium">{a.titulo}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{a.detalhe}</div>
                  </div>
                  {a.link && (
                    <Link to={a.link} className="text-sm inline-flex items-center gap-1 text-primary hover:underline">
                      Resolver <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}