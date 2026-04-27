import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Compras from "./Compras";
import NotasFiscais from "./NotasFiscais";
import Estoque from "./Estoque";
import Transferencias from "./Transferencias";
import AjustesPerdas from "./AjustesPerdas";
import FichasTecnicas from "./FichasTecnicas";
import OrdensProducao from "./OrdensProducao";
import Inventarios from "./Inventarios";
import Movimentacoes from "./Movimentacoes";

const PAGES = {
  "compras": Compras,
  "notas-fiscais": NotasFiscais,
  "estoque": Estoque,
  "transferencias": Transferencias,
  "ajustes-perdas": AjustesPerdas,
  "fichas-tecnicas": FichasTecnicas,
  "ordens-producao": OrdensProducao,
  "inventarios": Inventarios,
  "movimentacoes": Movimentacoes,
};

export default function OperacaoTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}