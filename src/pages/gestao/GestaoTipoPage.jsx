import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Dashboard from "./Dashboard";
import DRE from "./DRE";
import CMV from "./CMV";
import Margem from "./Margem";
import ResultadoLoja from "./ResultadoLoja";
import Consolidado from "./Consolidado";
import Comparativo from "./Comparativo";
import RelatoriosOperacionais from "./RelatoriosOperacionais";
import RelatoriosFinanceiros from "./RelatoriosFinanceiros";
import Alertas from "./Alertas";

const PAGES = {
  dashboard: Dashboard,
  dre: DRE,
  cmv: CMV,
  margem: Margem,
  "resultado-loja": ResultadoLoja,
  consolidado: Consolidado,
  comparativo: Comparativo,
  "relatorios-operacionais": RelatoriosOperacionais,
  "relatorios-financeiros": RelatoriosFinanceiros,
  alertas: Alertas,
};

export default function GestaoTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}