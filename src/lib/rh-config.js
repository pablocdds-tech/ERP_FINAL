import {
  Users, CalendarRange, FileText, GraduationCap, FileSignature,
  Building2, Layers, Wallet, CalendarDays,
  AlertTriangle, ClipboardList,
  ListChecks,
} from "lucide-react";

/**
 * Estrutura do menu RH — sem ponto eletrônico.
 *
 * O registro/apuração de ponto foi removido do ERP (integração externa futura).
 * Ficam: colaboradores, estrutura, programação de escalas/jornadas e RH geral.
 */

const item = (cfg) => ({ disponivel: true, ...cfg });

export const RH_GRUPOS = [
  {
    id: "pessoas",
    nome: "Pessoas e Estrutura",
    descricao: "Cadastro de colaboradores e organização da empresa.",
    icon: Users,
    itens: [
      item({ tipo: "colaboradores", nome: "Colaboradores", descricao: "Cadastro de pessoas, vínculos e status.", icon: Users }),
      item({ tipo: "estrutura", nome: "Estrutura Organizacional", descricao: "Departamentos, times e cargos.", icon: Layers }),
      item({ tipo: "lojas", nome: "Lojas / Unidades", descricao: "Unidades de negócio.", icon: Building2, link: "/admin/cadastros/lojas" }),
      item({ tipo: "centros-custo", nome: "Centros de Custo", descricao: "Distribuição de custos por área.", icon: Wallet, link: "/admin/cadastros/centros-custo" }),
    ],
  },
  {
    id: "programacao",
    nome: "Programação de Escalas",
    descricao: "Escalas, jornadas e calendário da equipe.",
    icon: CalendarRange,
    itens: [
      item({ tipo: "calendario", nome: "Calendário e Programação", descricao: "Escalas diárias, folgas e feriados.", icon: CalendarDays }),
      item({ tipo: "jornadas-turnos", nome: "Jornadas e Turnos", descricao: "Templates de jornada e turnos por loja.", icon: CalendarRange }),
      item({ tipo: "solicitacoes", nome: "Solicitações", descricao: "Folgas, trocas e ajustes da equipe.", icon: FileSignature }),
    ],
  },
  {
    id: "rh-geral",
    nome: "RH Geral",
    descricao: "Documentos, treinamentos e demandas da equipe.",
    icon: FileText,
    itens: [
      item({ tipo: "documentos", nome: "Documentos", descricao: "Atestados, contratos e arquivos.", icon: FileText }),
      item({ tipo: "treinamentos", nome: "Treinamentos", descricao: "Treinamentos, presenças e certificados.", icon: GraduationCap }),
      item({ tipo: "chamados", nome: "Chamados", descricao: "Chamados internos da equipe.", icon: AlertTriangle }),
      item({ tipo: "tarefas", nome: "Tarefas", descricao: "Tarefas atribuídas à equipe.", icon: ClipboardList }),
      item({ tipo: "checklists", nome: "Checklists", descricao: "Checklists operacionais da equipe.", icon: ListChecks }),
    ],
  },
];

/** Lista plana retrocompatível. */
export const RH_LIST = RH_GRUPOS.flatMap((g) => g.itens.filter((i) => i.disponivel));