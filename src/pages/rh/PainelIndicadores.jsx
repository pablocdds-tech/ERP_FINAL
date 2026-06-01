import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/rh/PageShell";
import PainelPontoIndicadores from "@/components/rh/PainelPontoIndicadores";

export default function PainelIndicadores() {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  return (
    <PageShell title="Painel de Indicadores" description="Resumo executivo do ponto eletrônico no dia.">
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Data:</span>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-[180px]" />
        </div>
      </Card>
      <PainelPontoIndicadores data={data} />
    </PageShell>
  );
}