import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";

import PdvPainel from "./PdvPainel";
import CardapioWebIntegracao from "@/pages/financeiro/CardapioWebIntegracao";
import PedidosImportados from "@/pages/financeiro/PedidosImportados";
import ResumoCardapioWeb from "@/pages/financeiro/ResumoCardapioWeb";

const PAGES = {
  "painel": PdvPainel,
  "cardapio-web": CardapioWebIntegracao,
  "pedidos-importados": PedidosImportados,
  "resumo-cardapio-web": ResumoCardapioWeb,
};

export default function PdvTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}