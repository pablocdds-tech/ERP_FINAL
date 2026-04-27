import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";

export default function Aprovacoes() {
  const [logs, setLogs] = useState([]);
  const [me, setMe] = useState(null);

  const carregar = () => base44.entities.AgentLog.filter({ status: "aguardando_aprovacao" }, "-created_date", 100).then(setLogs);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
    carregar();
  }, []);

  const aprovar = async (l) => {
    await base44.entities.AgentLog.update(l.id, {
      status: "concluido",
      aprovado_por: me?.email,
      aprovado_em: new Date().toISOString(),
    });
    carregar();
  };
  const rejeitar = async (l) => {
    await base44.entities.AgentLog.update(l.id, {
      status: "erro",
      erro_detalhe: "Rejeitado pelo gestor",
      aprovado_por: me?.email,
      aprovado_em: new Date().toISOString(),
    });
    carregar();
  };

  return (
    <PageShell title="Aprovações Pendentes" description="Ações sugeridas pelos agents que aguardam autorização humana antes de executar.">
      {logs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nada para aprovar ✅</Card>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{l.agent_chave}</Badge>
                    <div className="font-medium text-sm">{l.acao}</div>
                  </div>
                  {l.entidade_alvo && <div className="text-xs text-muted-foreground mt-1">Alvo: {l.entidade_alvo}</div>}
                  {l.input && <div className="text-xs mt-2 p-2 bg-muted rounded">{l.input}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {l.created_date ? format(new Date(l.created_date), "dd/MM HH:mm") : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => rejeitar(l)}><X className="w-3 h-3 mr-1" /> Rejeitar</Button>
                  <Button size="sm" onClick={() => aprovar(l)}><Check className="w-3 h-3 mr-1" /> Aprovar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}