import { CalendarRange, Clock } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import Jornadas from "./Jornadas";
import Turnos from "./Turnos";

export default function HubJornadas() {
  return (
    <TabsHub
      title="Jornadas e Turnos"
      description="Templates de jornada e faixas horárias por loja/setor."
      tabs={[
        { value: "jornadas", label: "Jornadas", icon: CalendarRange, content: <Jornadas /> },
        { value: "turnos", label: "Turnos", icon: Clock, content: <Turnos /> },
      ]}
    />
  );
}