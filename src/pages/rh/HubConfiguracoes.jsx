import { SlidersHorizontal, FileSignature } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import ConfiguracaoPonto from "./ConfiguracaoPonto";
import TiposAbono from "./TiposAbono";

export default function HubConfiguracoes() {
  return (
    <TabsHub
      title="Configurações do Ponto"
      description="Regras de cálculo e tipos de abono."
      tabs={[
        { value: "regras", label: "Regras de Ponto", icon: SlidersHorizontal, content: <ConfiguracaoPonto /> },
        { value: "abonos", label: "Tipos de Abono", icon: FileSignature, content: <TiposAbono /> },
      ]}
    />
  );
}