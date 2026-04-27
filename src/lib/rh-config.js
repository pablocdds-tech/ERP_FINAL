import {
  Users, Briefcase, CalendarRange, Clock, FileText, GraduationCap,
  ClipboardList, ListChecks, AlertCircle, FileSignature,
} from "lucide-react";

export const RH_LIST = [
  { tipo: "colaboradores", nome: "Colaboradores", descricao: "Cadastro de pessoas, vínculos e status.", icon: Users },
  { tipo: "cargos", nome: "Cargos", descricao: "Cargos, jornada e salário base.", icon: Briefcase },
  { tipo: "escalas", nome: "Escalas e Jornadas", descricao: "Programação de turnos por colaborador.", icon: CalendarRange },
  { tipo: "ponto", nome: "Espelho de Ponto", descricao: "Registros, atrasos, faltas e horas.", icon: Clock },
  { tipo: "solicitacoes", nome: "Solicitações", descricao: "Folgas, trocas, ajustes e justificativas.", icon: FileSignature },
  { tipo: "documentos", nome: "Documentos", descricao: "Atestados, contratos e arquivos.", icon: FileText },
  { tipo: "treinamentos", nome: "Treinamentos", descricao: "Treinamentos, presenças e certificados.", icon: GraduationCap },
  { tipo: "tarefas", nome: "Tarefas", descricao: "Tarefas atribuídas a colaboradores.", icon: ClipboardList },
  { tipo: "checklists", nome: "Checklists", descricao: "Modelos de checklist e execuções.", icon: ListChecks },
  { tipo: "chamados", nome: "Chamados", descricao: "Chamados abertos pelos colaboradores.", icon: AlertCircle },
];