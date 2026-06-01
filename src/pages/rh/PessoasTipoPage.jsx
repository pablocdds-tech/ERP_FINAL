import { useParams, Navigate } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";

// Cadastros básicos
import Colaboradores from "./Colaboradores";
import Solicitacoes from "./Solicitacoes";
import Documentos from "./Documentos";
import Treinamentos from "./Treinamentos";
import Tarefas from "./Tarefas";
import Checklists from "./Checklists";
import Chamados from "./Chamados";
import KioskDispositivos from "./KioskDispositivos";

// Hubs (telas com abas)
import HubPainel from "./HubPainel";
import HubTratamento from "./HubTratamento";
import HubEspelho from "./HubEspelho";
import HubCalendario from "./HubCalendario";
import HubJornadas from "./HubJornadas";
import HubEstrutura from "./HubEstrutura";
import HubRelatorios from "./HubRelatorios";
import HubConfiguracoes from "./HubConfiguracoes";

// Fechamento (não agrupado por enquanto)
import FechamentoMensal from "./FechamentoMensal";

/**
 * Mapa enxuto: hubs + cadastros que ficam soltos.
 * Telas antigas continuam acessíveis via ALIASES (redirect com aba pré-selecionada).
 */
const PAGES = {
  // Operação diária
  painel: HubPainel,
  tratamento: HubTratamento,
  espelho: HubEspelho,
  solicitacoes: Solicitacoes,

  // Pessoas e Estrutura
  colaboradores: Colaboradores,
  estrutura: HubEstrutura,

  // Programação do Ponto
  calendario: HubCalendario,
  "jornadas-turnos": HubJornadas,
  configuracoes: HubConfiguracoes,

  // Fechamento e Relatórios
  fechamento: FechamentoMensal,
  relatorios: HubRelatorios,

  // RH Geral
  documentos: Documentos,
  treinamentos: Treinamentos,
  chamados: Chamados,
  tarefas: Tarefas,
  checklists: Checklists,
  "kiosk-dispositivos": KioskDispositivos,
};

/** Tipo antigo → novo destino (rota + aba). */
const ALIASES = {
  // Painel
  indicadores: "/admin/pessoas/painel?tab=indicadores",
  "ponto-do-dia": "/admin/pessoas/painel?tab=hoje",
  // Tratamento
  pendentes: "/admin/pessoas/tratamento?tab=pendentes",
  justificativas: "/admin/pessoas/tratamento?tab=justificativas",
  // Espelho
  ponto: "/admin/pessoas/espelho?tab=espelho",
  "banco-horas-gestao": "/admin/pessoas/espelho?tab=banco-horas",
  // Calendário
  escalas: "/admin/pessoas/calendario?tab=escalas",
  folgas: "/admin/pessoas/calendario?tab=folgas",
  feriados: "/admin/pessoas/calendario?tab=feriados",
  // Jornadas
  jornadas: "/admin/pessoas/jornadas-turnos?tab=jornadas",
  turnos: "/admin/pessoas/jornadas-turnos?tab=turnos",
  // Estrutura
  departamentos: "/admin/pessoas/estrutura?tab=departamentos",
  times: "/admin/pessoas/estrutura?tab=times",
  cargos: "/admin/pessoas/estrutura?tab=cargos",
  // Configurações
  "configuracao-ponto": "/admin/pessoas/configuracoes?tab=regras",
  abonos: "/admin/pessoas/configuracoes?tab=abonos",
  // Relatórios
  "rel-cartao-ponto": "/admin/pessoas/relatorios?tab=cartao",
  "rel-faltas-atrasos": "/admin/pessoas/relatorios?tab=faltas",
  "rel-horas-extras": "/admin/pessoas/relatorios?tab=he",
  "rel-totalizadores-folha": "/admin/pessoas/relatorios?tab=folha",
};

export default function PessoasTipoPage() {
  const { tipo } = useParams();
  if (ALIASES[tipo]) return <Navigate to={ALIASES[tipo]} replace />;
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}