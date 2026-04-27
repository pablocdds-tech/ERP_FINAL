import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Campanhas from "./Campanhas";
import Cupons from "./Cupons";
import Clientes from "./Clientes";
import Ranking from "./Ranking";
import Performance from "./Performance";
import Recorrencia from "./Recorrencia";
import Inativos from "./Inativos";
import Disparos from "./Disparos";
import Indicadores from "./Indicadores";

const PAGES = {
  campanhas: Campanhas,
  cupons: Cupons,
  clientes: Clientes,
  ranking: Ranking,
  performance: Performance,
  recorrencia: Recorrencia,
  inativos: Inativos,
  disparos: Disparos,
  indicadores: Indicadores,
};

export default function MarketingTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}