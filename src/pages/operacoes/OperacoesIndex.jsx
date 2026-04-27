import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { OPERACOES_LIST } from "@/lib/operacoes-config";
import { getModule } from "@/lib/modules";

export default function OperacoesIndex() {
  const mod = getModule("operacoes");
  return (
    <div>
      <PageHeader title={mod.nome} description={mod.descricao} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {OPERACOES_LIST.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.slug} to={`/operacoes/${c.slug}`}>
              <Card className="p-5 h-full hover:border-foreground/30 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.descricao}</div>
                    <div className="mt-3 flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>Abrir</span>
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}