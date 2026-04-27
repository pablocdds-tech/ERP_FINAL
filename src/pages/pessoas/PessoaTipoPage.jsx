import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Colaboradores from "./Colaboradores";
import Cargos from "./Cargos";
import Escalas from "./Escalas";
import Ponto from "./Ponto";
import Solicitacoes from "./Solicitacoes";
import Documentos from "./Documentos";
import Treinamentos from "./Treinamentos";
import Tarefas from "./Tarefas";
import Checklists from "./Checklists";
import Chamados from "./Chamados";

const PAGES = {
  colaboradores: Colaboradores,
  cargos: Cargos,
  escalas: Escalas,
  ponto: Ponto,
  solicitacoes: Solicitacoes,
  documentos: Documentos,
  treinamentos: Treinamentos,
  tarefas: Tarefas,
  checklists: Checklists,
  chamados: Chamados,
};

export default function PessoaTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}