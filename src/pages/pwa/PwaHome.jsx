import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, ListChecks, MessageSquare, Camera, Coffee, ShieldCheck, FileText, Bell, BarChart3 } from "lucide-react";
import { usePwa } from "@/lib/PwaContext";

const ACOES_FUNC = [
  { to: "/pwa/ponto", icon: Clock, label: "Bater ponto" },
  { to: "/pwa/escala", icon: Calendar, label: "Minha escala" },
  { to: "/pwa/tarefas", icon: ListChecks, label: "Tarefas" },
  { to: "/pwa/checklist", icon: ListChecks, label: "Checklists" },
  { to: "/pwa/chamados", icon: MessageSquare, label: "Chamados" },
  { to: "/pwa/solicitacoes", icon: FileText, label: "Solicitações" },
];

const ACOES_GESTOR = [
  { to: "/pwa/aprovacoes", icon: ShieldCheck, label: "Aprovações" },
  { to: "/pwa/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/pwa/equipe", icon: Calendar, label: "Equipe / Ponto" },
  { to: "/pwa/tarefas", icon: ListChecks, label: "Tarefas" },
  { to: "/pwa/chamados", icon: MessageSquare, label: "Chamados" },
  { to: "/pwa/notificacoes", icon: Bell, label: "Notificações" },
];

export default function PwaHome() {
  const { user, colaborador, gestor } = usePwa() || {};

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = colaborador?.nome?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Colaborador";

  const acoes = gestor ? ACOES_GESTOR : ACOES_FUNC;

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs text-muted-foreground">{saudacao},</div>
        <div className="text-xl font-semibold mt-0.5">{nome}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      <Card className="p-5 mb-6 bg-primary text-primary-foreground border-0">
        <div className="text-xs opacity-80">Próxima ação</div>
        <div className="text-lg font-medium mt-1">{gestor ? "Ver aprovações pendentes" : "Bater ponto"}</div>
        <Link
          to={gestor ? "/pwa/aprovacoes" : "/pwa/ponto"}
          className="inline-flex items-center gap-2 mt-4 text-sm bg-primary-foreground text-primary rounded-lg px-4 py-2 font-medium"
        >
          {gestor ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {gestor ? "Abrir central" : "Registrar agora"}
        </Link>
      </Card>

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {gestor ? "Atalhos do gestor" : "Ações rápidas"}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {acoes.map((a) => {
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