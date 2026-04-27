import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "./PageHeader";

// Componente reutilizável para a página inicial de cada módulo.
// Lista os submódulos como cards "em breve" — implementação incremental.
export default function ModuleIndex({ module }) {
  if (!module) return null;
  const Icon = module.icon;

  return (
    <div>
      <PageHeader title={module.nome} description={module.descricao} />

      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="text-sm text-muted-foreground">
          {module.submodulos.length} submódulos planejados nesta área.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {module.submodulos.map((sub) => (
          <Card
            key={sub}
            className="p-4 hover:border-foreground/30 transition-colors cursor-default group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">{sub}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Em construção
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal">
                Em breve
              </Badge>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>Configurar</span>
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}