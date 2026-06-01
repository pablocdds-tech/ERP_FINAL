import { FileText, AlertTriangle, Sun, FileSpreadsheet } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import RelCartaoPonto from "./RelCartaoPonto";
import RelFaltasAtrasos from "./RelFaltasAtrasos";
import RelHorasExtras from "./RelHorasExtras";
import RelTotalizadoresFolha from "./RelTotalizadoresFolha";

export default function HubRelatorios() {
  return (
    <TabsHub
      title="Relatórios de Ponto"
      description="Relatórios gerenciais e totalizadores para a folha."
      tabs={[
        { value: "cartao", label: "Cartão de Ponto", icon: FileText, content: <RelCartaoPonto /> },
        { value: "faltas", label: "Faltas e Atrasos", icon: AlertTriangle, content: <RelFaltasAtrasos /> },
        { value: "he", label: "Horas Extras", icon: Sun, content: <RelHorasExtras /> },
        { value: "folha", label: "Totalizadores Folha", icon: FileSpreadsheet, content: <RelTotalizadoresFolha /> },
      ]}
    />
  );
}