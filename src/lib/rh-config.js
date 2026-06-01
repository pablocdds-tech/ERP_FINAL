import {
  Users, Briefcase, CalendarRange, Clock, FileText, GraduationCap, FileSignature,
  SlidersHorizontal, Tablet, BarChart3, Building2, Layers, Wallet, CalendarDays,
  Sun, Moon, Coffee, Timer, FileCheck2, FileSpreadsheet, ShieldCheck, FilePlus2,
  CheckSquare, FileBarChart, FileLock2, Database, ListChecks, AlertTriangle,
  ClipboardList, RefreshCw, ScrollText, Stamp, BookOpenCheck, BadgeCheck,
} from "lucide-react";

/**
 * Estrutura do menu RH/Ponto Eletrônico — Checkpoint 1 do roadmap.
 *
 * Agrupado em 7 seções fixas. Itens com `disponivel: false` são placeholders
 * "em desenvolvimento" e não devem ser navegáveis ainda. Quando uma tela for
 * implementada nos próximos checkpoints, basta marcar `disponivel: true` e
 * preencher `tipo` com a rota correspondente.
 *
 * Nada aqui altera business logic — apenas a organização de navegação.
 */

const item = (cfg) => ({ disponivel: true, ...cfg });

export const RH_GRUPOS = [
  {
    id: "indicadores",
    nome: "Indicadores",
    descricao: "Visão rápida de presença, pendências e exceções.",
    icon: BarChart3,
    itens: [
      item({ tipo: "indicadores", nome: "Painel de Indicadores", descricao: "Cards e gráficos do ponto.", icon: BarChart3, disponivel: false }),
    ],
  },
  {
    id: "cadastros",
    nome: "Cadastros Básicos",
    descricao: "Pessoas, lojas, times, cargos e centros de custo.",
    icon: Users,
    itens: [
      item({ tipo: "colaboradores", nome: "Colaboradores", descricao: "Cadastro de pessoas, vínculos e status.", icon: Users }),
      item({ tipo: "lojas", nome: "Lojas / Unidades", descricao: "Unidades de negócio e responsáveis.", icon: Building2, link: "/admin/cadastros/lojas" }),
      item({ tipo: "times", nome: "Times / Setores", descricao: "Cozinha, atendimento, delivery, etc.", icon: Layers }),
      item({ tipo: "departamentos", nome: "Departamentos", descricao: "Operação, administrativo, produção.", icon: Layers }),
      item({ tipo: "cargos", nome: "Cargos", descricao: "Cargos, jornada e salário base.", icon: Briefcase }),
      item({ tipo: "centros-custo", nome: "Centros de Custo", descricao: "Distribuição de custos por área.", icon: Wallet, link: "/admin/cadastros/centros-custo" }),
    ],
  },
  {
    id: "configuracoes",
    nome: "Configurações do Ponto",
    descricao: "Regras que controlam como o ponto é interpretado.",
    icon: SlidersHorizontal,
    itens: [
      item({ tipo: "jornadas", nome: "Jornadas e Escalas", descricao: "Templates de jornada (6x1, 12x36, etc) com horários e tolerâncias.", icon: CalendarRange }),
      item({ tipo: "escalas", nome: "Programação Diária", descricao: "Escala dia a dia por colaborador.", icon: CalendarDays }),
      item({ tipo: "turnos", nome: "Turnos", descricao: "Faixas horárias por loja/setor.", icon: Clock }),
      item({ tipo: "feriados", nome: "Calendário de Feriados", descricao: "Feriados nacionais, estaduais e da empresa.", icon: CalendarDays }),
      item({ tipo: "abonos", nome: "Abonos e Justificativas", descricao: "Tipos, regras e documentos exigidos.", icon: FileSignature }),
      item({ tipo: "configuracao-ponto", nome: "Regras de Ponto", descricao: "Banco de horas, hora extra, adicional noturno e intervalos.", icon: SlidersHorizontal }),
    ],
  },
  {
    id: "gestao",
    nome: "Gestão do Ponto",
    descricao: "Operação diária do gestor — apenas exceções.",
    icon: ClipboardList,
    itens: [
      item({ tipo: "ponto-do-dia", nome: "Ponto do Dia", descricao: "Quem está presente, ausente, atrasado.", icon: Clock, disponivel: false }),
      item({ tipo: "tratamento", nome: "Tratamento de Ponto", descricao: "Ajustes, abonos e marcações pendentes.", icon: ListChecks, disponivel: false }),
      item({ tipo: "pendentes", nome: "Pontos Pendentes de Revisão", descricao: "Exceções: PIN, baixa confiança, offline.", icon: AlertTriangle, disponivel: false }),
      item({ tipo: "solicitacoes", nome: "Solicitações de Ajuste", descricao: "Folgas, trocas, ajustes e justificativas.", icon: FileSignature }),
      item({ tipo: "justificativas", nome: "Justificativas e Atestados", descricao: "Atestados, abonos e documentos.", icon: FilePlus2, disponivel: false }),
      item({ tipo: "folgas", nome: "Calendário de Folgas", descricao: "Folgas, férias e ausências.", icon: CalendarDays, disponivel: false }),
      item({ tipo: "ponto", nome: "Cartão / Espelho de Ponto", descricao: "Registros do colaborador no período.", icon: Clock }),
      item({ tipo: "abono-massa", nome: "Abono em Massa", descricao: "Aplicar abonos a vários colaboradores.", icon: CheckSquare, disponivel: false }),
      item({ tipo: "ajustes-massa", nome: "Ajustes em Massa", descricao: "Correções amplas com auditoria.", icon: CheckSquare, disponivel: false }),
      item({ tipo: "banco-horas-gestao", nome: "Saldo de Banco de Horas", descricao: "Saldos, compensações e validades por colaborador.", icon: Timer, disponivel: false }),
      item({ tipo: "pausas", nome: "Pausas e Intervalos", descricao: "Conformidade de intervalo realizado.", icon: Coffee, disponivel: false }),
      item({ tipo: "fechamento", nome: "Fechamento Mensal", descricao: "Travar período e gerar totalizadores oficiais por colaborador.", icon: BookOpenCheck }),
    ],
  },
  {
    id: "relatorios",
    nome: "Relatórios",
    descricao: "Relatórios gerenciais para folha e gestão.",
    icon: FileBarChart,
    itens: [
      item({ tipo: "rel-cartao-ponto", nome: "Cartão de Ponto", descricao: "Cartão individual por período.", icon: FileText, disponivel: false }),
      item({ tipo: "rel-marcacoes", nome: "Marcações de Ponto", descricao: "Lista bruta de marcações.", icon: ScrollText, disponivel: false }),
      item({ tipo: "rel-absenteismo", nome: "Absenteísmo", descricao: "Faltas e ausências por loja/setor.", icon: AlertTriangle, disponivel: false }),
      item({ tipo: "rel-faltas-atrasos", nome: "Faltas e Atrasos", descricao: "Atrasos e ausências do período.", icon: AlertTriangle, disponivel: false }),
      item({ tipo: "rel-horas-extras", nome: "Horas Extras", descricao: "HE 50%, 100% e domingos.", icon: Sun, disponivel: false }),
      item({ tipo: "rel-horas-noturnas", nome: "Horas Noturnas", descricao: "Adicional noturno por colaborador.", icon: Moon, disponivel: false }),
      item({ tipo: "rel-banco-horas", nome: "Banco de Horas", descricao: "Saldos e movimentações.", icon: Timer, disponivel: false }),
      item({ tipo: "rel-totalizadores-folha", nome: "Totalizadores para Folha", descricao: "Resumo por colaborador para a folha.", icon: FileSpreadsheet, disponivel: false }),
      item({ tipo: "rel-justificativas", nome: "Justificativas e Atestados", descricao: "Histórico de abonos e documentos.", icon: FileCheck2, disponivel: false }),
      item({ tipo: "rel-esquecimento", nome: "Esquecimento de Ponto", descricao: "Marcações ausentes na sequência.", icon: AlertTriangle, disponivel: false }),
      item({ tipo: "rel-intervalos", nome: "Intervalos e Pausas", descricao: "Conformidade de pausas.", icon: Coffee, disponivel: false }),
      item({ tipo: "rel-colab-loja", nome: "Colaboradores por Loja/Setor", descricao: "Distribuição da equipe.", icon: Users, disponivel: false }),
      item({ tipo: "rel-horas-cc", nome: "Horas por Centro de Custo", descricao: "Horas trabalhadas por CC.", icon: Wallet, disponivel: false }),
    ],
  },
  {
    id: "fiscais",
    nome: "Relatórios Fiscais",
    descricao: "Arquivos exigidos pela legislação trabalhista.",
    icon: FileLock2,
    itens: [
      item({ tipo: "fiscal-espelho", nome: "Espelho de Ponto", descricao: "Espelho mensal por colaborador.", icon: FileText, disponivel: false }),
      item({ tipo: "fiscal-afd", nome: "AFD REP-P", descricao: "Arquivo Fonte de Dados (Portaria 671).", icon: FileSpreadsheet, disponivel: false }),
      item({ tipo: "fiscal-aej", nome: "AEJ", descricao: "Arquivo Eletrônico de Jornada.", icon: FileSpreadsheet, disponivel: false }),
      item({ tipo: "fiscal-attr-rep", nome: "ATTR REP-P", descricao: "Atributos do programa REP-P.", icon: Stamp, disponivel: false }),
      item({ tipo: "fiscal-attr-ptrp", nome: "ATTR PTRP", descricao: "Atributos do programa PTRP.", icon: Stamp, disponivel: false }),
      item({ tipo: "fiscal-integridade", nome: "Verificação de Integridade", descricao: "Validação da cadeia de NSR e hashes.", icon: ShieldCheck, disponivel: false }),
      item({ tipo: "fiscal-p7s", nome: "Arquivos Assinados / P7S", descricao: "Arquivos assinados digitalmente.", icon: BadgeCheck, disponivel: false }),
    ],
  },
  {
    id: "coletores",
    nome: "Coletores de Ponto",
    descricao: "Tablets, dispositivos autorizados e sincronização.",
    icon: Tablet,
    itens: [
      item({ tipo: "kiosk-dispositivos", nome: "Kiosks / Tablets", descricao: "Aprovar e gerenciar tablets do Kiosk.", icon: Tablet }),
      item({ tipo: "dispositivos-autorizados", nome: "Dispositivos Autorizados", descricao: "Gestão de devices autorizados.", icon: ShieldCheck, disponivel: false }),
      item({ tipo: "pwa-autorizado", nome: "App PWA Autorizado", descricao: "Controle de quem pode bater pelo PWA.", icon: ShieldCheck, disponivel: false }),
      item({ tipo: "importar-afd", nome: "Importar AFD", descricao: "Importar arquivos de outros sistemas.", icon: Database, disponivel: false }),
      item({ tipo: "gateway", nome: "Gateway / Integrações", descricao: "Conexões com sistemas externos.", icon: RefreshCw, disponivel: false }),
      item({ tipo: "logs-sync", nome: "Logs de Sincronização", descricao: "Eventos e erros dos coletores.", icon: ScrollText, disponivel: false }),
      // Itens já existentes que ainda não se encaixam nos checkpoints — mantidos sob coletores/extras
      item({ tipo: "documentos", nome: "Documentos", descricao: "Atestados, contratos e arquivos.", icon: FileText }),
      item({ tipo: "treinamentos", nome: "Treinamentos", descricao: "Treinamentos, presenças e certificados.", icon: GraduationCap }),
    ],
  },
];

/**
 * Lista plana retrocompatível — usada por outros pontos que ainda esperam
 * `RH_LIST`. Inclui APENAS os itens disponíveis (com rota real).
 */
export const RH_LIST = RH_GRUPOS.flatMap((g) => g.itens.filter((i) => i.disponivel));