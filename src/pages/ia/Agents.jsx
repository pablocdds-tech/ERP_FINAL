import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import PageShell from "@/components/ia/PageShell";
import { AGENTS } from "@/lib/ia-config";

export default function Agents() {
  return (
    <PageShell title="Agents" description="Os 20 agents internos da plataforma. IA não executa ações críticas sem aprovação humana.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {AGENTS.map((a) => (
          <Card key={a.chave} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{a.nome}</div>
                  <Badge variant="outline" className="text-[10px]">{a.chave}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{a.descricao}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}