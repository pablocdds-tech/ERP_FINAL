import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Reclamacoes from "./Reclamacoes";
import Tratativas from "./Tratativas";
import Avaliacoes from "./Avaliacoes";
import NPS from "./NPS";
import OcorrenciasPedido from "./OcorrenciasPedido";
import Cortesias from "./Cortesias";
import Reembolsos from "./Reembolsos";
import Historico from "./Historico";
import Indicadores from "./Indicadores";

const PAGES = {
  reclamacoes: Reclamacoes,
  tratativas: Tratativas,
  avaliacoes: Avaliacoes,
  nps: NPS,
  "ocorrencias-pedido": OcorrenciasPedido,
  cortesias: Cortesias,
  reembolsos: Reembolsos,
  historico: Historico,
  indicadores: Indicadores,
};

export default function AtendimentoTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}