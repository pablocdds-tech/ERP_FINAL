import { useParams } from "react-router-dom";
import CadastroPage from "@/components/cadastros/CadastroPage";
import { getCadastro } from "@/lib/cadastros-config";
import PageNotFound from "@/lib/PageNotFound";

export default function CadastroTipoPage() {
  const { tipo } = useParams();
  const config = getCadastro(tipo);
  if (!config) return <PageNotFound />;
  return <CadastroPage key={tipo} config={config} />;
}