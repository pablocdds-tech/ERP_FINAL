import { useParams } from "react-router-dom";
import ModuleIndex from "@/components/common/ModuleIndex";
import { getModule } from "@/lib/modules";
import PageNotFound from "@/lib/PageNotFound";

// Página única que renderiza qualquer módulo a partir do parâmetro de rota.
// Evita duplicação: 1 arquivo serve para os 10 módulos.
export default function ModulePage() {
  const { moduleId } = useParams();
  const mod = getModule(moduleId);
  if (!mod) return <PageNotFound />;
  return <ModuleIndex module={mod} />;
}