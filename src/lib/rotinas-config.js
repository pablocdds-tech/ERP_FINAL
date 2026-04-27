import {
  ListChecks, ClipboardList, AlertCircle, Siren, ShieldCheck,
  Wrench, Hammer, FileSpreadsheet, Settings2,
} from "lucide-react";

export const ROTINAS_LIST = [
  { tipo: "checklists", nome: "Checklists", descricao: "Modelos de checklist e execuções da equipe.", icon: ListChecks },
  { tipo: "tarefas", nome: "Tarefas", descricao: "Atribuição e acompanhamento de tarefas.", icon: ClipboardList },
  { tipo: "chamados", nome: "Chamados", descricao: "Solicitações abertas pela equipe.", icon: AlertCircle },
  { tipo: "ocorrencias", nome: "Ocorrências", descricao: "Eventos operacionais a tratar.", icon: Siren },
  { tipo: "auditorias", nome: "Auditorias", descricao: "Auditorias internas com score por loja.", icon: ShieldCheck },
  { tipo: "equipamentos", nome: "Equipamentos", descricao: "Patrimônio e histórico de manutenção.", icon: Settings2 },
  { tipo: "ordens-servico", nome: "Ordens de Serviço", descricao: "OS preventivas e corretivas.", icon: Wrench },
  { tipo: "manutencao", nome: "Planos de Manutenção", descricao: "Manutenção preventiva agendada.", icon: Hammer },
  { tipo: "evidencias", nome: "Evidências", descricao: "Galeria de fotos das execuções.", icon: FileSpreadsheet },
];