import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Checklists from "./Checklists";
import Tarefas from "./Tarefas";
import Chamados from "./Chamados";
import Ocorrencias from "./Ocorrencias";
import Auditorias from "./Auditorias";
import Equipamentos from "./Equipamentos";
import OrdensServico from "./OrdensServico";
import Manutencao from "./Manutencao";
import Evidencias from "./Evidencias";

const PAGES = {
  checklists: Checklists,
  tarefas: Tarefas,
  chamados: Chamados,
  ocorrencias: Ocorrencias,
  auditorias: Auditorias,
  equipamentos: Equipamentos,
  "ordens-servico": OrdensServico,
  manutencao: Manutencao,
  evidencias: Evidencias,
};

export default function RotinasTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}