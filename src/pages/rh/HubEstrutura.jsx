import { Layers, Briefcase } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import Departamentos from "./Departamentos";
import Times from "./Times";
import Cargos from "./Cargos";

export default function HubEstrutura() {
  return (
    <TabsHub
      title="Estrutura Organizacional"
      description="Departamentos, times/setores e cargos."
      tabs={[
        { value: "departamentos", label: "Departamentos", icon: Layers, content: <Departamentos /> },
        { value: "times", label: "Times / Setores", icon: Layers, content: <Times /> },
        { value: "cargos", label: "Cargos", icon: Briefcase, content: <Cargos /> },
      ]}
    />
  );
}