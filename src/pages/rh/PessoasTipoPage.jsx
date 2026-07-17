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

// Hubs (telas com abas) — estrutura, calendário e jornadas continuam no RH
import HubCalendario from "./HubCalendario";
import HubJornadas from "./HubJornadas";
import HubEstrutura from "./HubEstrutura";

/**
 * Mapa de páginas do RH (sem ponto eletrônico).
 * Telas antigas continuam acessíveis via ALIASES (redirect com aba pré-selecionada).
 */
const PAGES = {
  // Operação diária
  solicitacoes: Solicitacoes,

  // Pessoas e Estrutura
  colaboradores: Colaboradores,
  estrutura: HubEstrutura,

  // Programação (escalas/jornadas/feriados)
  calendario: HubCalendario,
  "jornadas-turnos": HubJornadas,

  // RH Geral
  documentos: Documentos,
  treinamentos: Treinamentos,
  chamados: Chamados,
  tarefas: Tarefas,
  checklists: Checklists,
};

/** Tipo antigo → novo destino (rota + aba). */
const ALIASES = {
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
};

export default function PessoasTipoPage() {
  const { tipo } = useParams();
  if (ALIASES[tipo]) return <Navigate to={ALIASES[tipo]} replace />;
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}