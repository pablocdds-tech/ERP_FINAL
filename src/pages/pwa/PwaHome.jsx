import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, ListChecks, MessageSquare, Camera, Coffee } from "lucide-react";

const ACOES = [
  { to: "/pwa/ponto", icon: Clock, label: "Bater ponto" },
  { to: "/pwa/escala", icon: Calendar, label: "Minha escala" },
  { to: "/pwa/checklist", icon: ListChecks, label: "Checklist" },
  { to: "/pwa/chamados", icon: MessageSquare, label: "Chamados" },
  { to: "/pwa/chamados", icon: Camera, label: "Enviar foto" },
  { to: "/pwa/chamados", icon: Coffee, label: "Solicitar folga" },
];

export default function PwaHome() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs text-muted-foreground">{saudacao},</div>
        <div className="text-xl font-semibold mt-0.5">
          {user?.full_name?.split(" ")[0] || "Colaborador"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      <Card className="p-5 mb-6 bg-primary text-primary-foreground border-0">
        <div className="text-xs opacity-80">Próxima ação</div>
        <div className="text-lg font-medium mt-1">Bater ponto de entrada</div>
        <Link
          to="/pwa/ponto"
          className="inline-flex items-center gap-2 mt-4 text-sm bg-primary-foreground text-primary rounded-lg px-4 py-2 font-medium"
        >
          <Clock className="w-4 h-4" />
          Registrar agora
        </Link>
      </Card>

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Ações rápidas
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ACOES.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} to={a.to}>
              <Card className="p-4 h-full hover:border-foreground/30 transition-colors">
                <Icon className="w-5 h-5 mb-3" />
                <div className="text-sm font-medium">{a.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}