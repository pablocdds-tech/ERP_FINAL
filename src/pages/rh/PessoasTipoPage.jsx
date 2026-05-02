import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Colaboradores from "./Colaboradores";
import Cargos from "./Cargos";
import Escalas from "./Escalas";
import EspelhoPonto from "./EspelhoPonto";
import Solicitacoes from "./Solicitacoes";
import Documentos from "./Documentos";
import Treinamentos from "./Treinamentos";
import Tarefas from "./Tarefas";
import Checklists from "./Checklists";
import Chamados from "./Chamados";
import ConfiguracaoPonto from "./ConfiguracaoPonto";

const PAGES = {
  colaboradores: Colaboradores,
  cargos: Cargos,
  escalas: Escalas,
  ponto: EspelhoPonto,
  "configuracao-ponto": ConfiguracaoPonto,
  solicitacoes: Solicitacoes,
  documentos: Documentos,
  treinamentos: Treinamentos,
  tarefas: Tarefas,
  checklists: Checklists,
  chamados: Chamados,
};

export default function PessoasTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}