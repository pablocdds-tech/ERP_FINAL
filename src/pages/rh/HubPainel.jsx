import { BarChart3, Clock } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import PontoDoDia from "./PontoDoDia";
import PainelIndicadores from "./PainelIndicadores";

export default function HubPainel() {
  return (
    <TabsHub
      title="Painel do Ponto"
      description="Visão executiva e operacional do ponto eletrônico."
      tabs={[
        { value: "hoje", label: "Ponto do Dia", icon: Clock, content: <PontoDoDia /> },
        { value: "indicadores", label: "Indicadores", icon: BarChart3, content: <PainelIndicadores /> },
      ]}
    />
  );
}