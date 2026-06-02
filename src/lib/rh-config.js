import {
  Users, Briefcase, CalendarRange, Clock, FileText, GraduationCap, FileSignature,
  SlidersHorizontal, Tablet, BarChart3, Building2, Layers, Wallet, CalendarDays,
  Timer, FileBarChart, FileLock2, AlertTriangle, ClipboardList, BookOpenCheck,
  LayoutDashboard, ListChecks,
} from "lucide-react";

/**
 * Estrutura do menu RH/Ponto Eletrônico — VERSÃO ENXUTA.
 *
 * Reduzido de ~50 itens em 7 grupos para ~20 itens em 5 grupos,
 * agrupando telas familiares em HUBS com abas (TabsHub). Nada foi
 * removido — tudo continua acessível via aba ou alias de rota.
 */

const item = (cfg) => ({ disponivel: true, ...cfg });

export const RH_GRUPOS = [
  {
    id: "operacao",
    nome: "Operação Diária",
    descricao: "O que o gestor usa todo dia.",
    icon: LayoutDashboard,
    itens: [
      item({ tipo: "painel", nome: "Painel do Ponto", descricao: "Ponto do dia + indicadores executivos.", icon: BarChart3 }),
      item({ tipo: "tratamento", nome: "Tratamento de Ponto", descricao: "Faltas, atrasos, pendências e justificativas.", icon: ListChecks }),
      item({ tipo: "espelho", nome: "Espelho de Ponto", descricao: "Registros do colaborador e banco de horas.", icon: Clock }),
      item({ tipo: "solicitacoes", nome: "Solicitações", descricao: "Folgas, trocas e ajustes do PWA.", icon: FileSignature }),
    ],
  },
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
    id: "ponto",
    nome: "Programação do Ponto",
    descricao: "Como o ponto deve funcionar.",
    icon: SlidersHorizontal,
    itens: [
      item({ tipo: "calendario", nome: "Calendário e Programação", descricao: "Escalas diárias, folgas e feriados.", icon: CalendarDays }),
      item({ tipo: "jornadas-turnos", nome: "Jornadas e Turnos", descricao: "Templates de jornada e turnos por loja.", icon: CalendarRange }),
      item({ tipo: "configuracoes", nome: "Configurações do Ponto", descricao: "Regras de cálculo e tipos de abono.", icon: SlidersHorizontal }),
      item({ tipo: "kiosk-dispositivos", nome: "Kiosks / Tablets", descricao: "Coletores de ponto: aprovar e gerenciar tablets do Kiosk.", icon: Tablet }),
    ],
  },
  {
    id: "fechamento",
    nome: "Fechamento e Relatórios",
    descricao: "Geração da folha e relatórios oficiais.",
    icon: FileBarChart,
    itens: [
      item({ tipo: "fechamento", nome: "Fechamento Mensal", descricao: "Travar período e gerar totalizadores oficiais.", icon: BookOpenCheck }),
      item({ tipo: "relatorios", nome: "Relatórios de Ponto", descricao: "Cartão, faltas, HE e totalizadores para folha.", icon: FileBarChart }),
      item({ tipo: "fiscal", nome: "Relatórios Fiscais", descricao: "AFD, AEJ e arquivos exigidos pela Portaria 671.", icon: FileLock2, disponivel: false }),
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