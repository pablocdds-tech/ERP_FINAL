import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { AGENTS } from "@/lib/agents";

export default function Agentes() {
  return (
    <div>
      <PageHeader
        title="Agents do Sistema"
        description="Estrutura conceitual dos 20 agents que automatizarão domínios do ERP. Implementação será incremental."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AGENTS.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{a.nome}</div>
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    #{a.id.toString().padStart(2, "0")}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{a.descricao}</div>
                <div className="text-[11px] text-muted-foreground mt-3 uppercase tracking-wide">
                  Conceitual · não implementado
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}