import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { RH_GRUPOS } from "@/lib/rh-config";
import { getModule } from "@/lib/modules";

export default function RHIndex() {
  const m = getModule("pessoas");
  return (
    <div>
      <PageHeader title={m.nome} description={m.descricao} />

      <div className="space-y-8">
        {RH_GRUPOS.map((grupo) => {
          const GIcon = grupo.icon;
          return (
            <section key={grupo.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <GIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{grupo.nome}</h2>
                  <p className="text-xs text-muted-foreground">{grupo.descricao}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grupo.itens.map((item, idx) => {
                  const Icon = item.icon;
                  const key = `${grupo.id}-${item.tipo}-${idx}`;
                  if (!item.disponivel) {
                    return (
                      <Card
                        key={key}
                        className="p-5 h-full opacity-60 cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-sm font-medium">{item.nome}</div>
                              <Badge variant="outline" className="text-[10px]">Em desenvolvimento</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.descricao}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                  return (
                    <Link key={key} to={item.link || `/admin/pessoas/${item.tipo}`}>
                      <Card className="p-5 h-full hover:border-foreground/30 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{item.nome}</div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.descricao}
                            </div>
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
            </section>
          );
        })}
      </div>
    </div>
  );
}