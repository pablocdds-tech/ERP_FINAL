import { useParams } from "react-router-dom";
import CadastroPage from "@/components/cadastros/CadastroPage";
import { getCadastro } from "@/lib/cadastros-config";
import PageNotFound from "@/lib/PageNotFound";
import PlanoCategorias from "./PlanoCategorias";
import ImportarItens from "./ImportarItens";

const CUSTOM_PAGES = {
  PlanoCategorias,
  ImportarItens,
};

export default function CadastroTipoPage() {
  const { tipo } = useParams();
  const config = getCadastro(tipo);
  if (!config) return <PageNotFound />;
  if (config.customPage && CUSTOM_PAGES[config.customPage]) {
    const Comp = CUSTOM_PAGES[config.customPage];
    return <Comp key={tipo} />;
  }
  return <CadastroPage key={tipo} config={config} />;
}