import { ListChecks, AlertTriangle, FileSignature } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import TratamentoPonto from "./TratamentoPonto";
import PontosPendentes from "./PontosPendentes";
import Justificativas from "./Justificativas";

export default function HubTratamento() {
  return (
    <TabsHub
      title="Tratamento de Ponto"
      description="Abonos, justificativas e revisão de exceções."
      tabs={[
        { value: "tratamento", label: "Faltas e Atrasos", icon: ListChecks, content: <TratamentoPonto /> },
        { value: "pendentes", label: "Pendentes de Revisão", icon: AlertTriangle, content: <PontosPendentes /> },
        { value: "justificativas", label: "Justificativas e Atestados", icon: FileSignature, content: <Justificativas /> },
      ]}
    />
  );
}