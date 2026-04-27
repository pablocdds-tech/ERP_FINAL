import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Store, Users, Boxes, TrendingUp } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { MODULES } from "@/lib/modules";
import { Link } from "react-router-dom";

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-2">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
    </div>
  </Card>
);

export default function Dashboard() {
  const [lojas, setLojas] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.entities.Loja.list().then((d) => setLojas(d || []));
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const ativas = lojas.filter((l) => l.ativo !== false).length;
  const cds = lojas.filter((l) => l.tipo === "cd").length;

  return (
    <div>
      <PageHeader
        title={`Olá${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description="Visão geral do sistema. A fundação está pronta — os módulos serão construídos de forma incremental."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Store} label="Lojas" value={lojas.length} hint={`${ativas} ativas`} />
        <StatCard icon={Boxes} label="Centros de Distribuição" value={cds} hint="CD operacional" />
        <StatCard icon={Users} label="Usuários" value="—" hint="Em breve" />
        <StatCard icon={TrendingUp} label="Vendas hoje" value="—" hint="Em breve" />
      </div>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-base font-semibold">Módulos do sistema</h2>
        <span className="text-xs text-muted-foreground">10 áreas</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.id} to={m.path}>
              <Card className="p-5 h-full hover:border-foreground/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{m.nome}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {m.descricao}
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