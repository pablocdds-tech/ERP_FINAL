import { CalendarDays, CalendarRange, Sun } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import Escalas from "./Escalas";
import CalendarioFolgas from "./CalendarioFolgas";
import Feriados from "./Feriados";

export default function HubCalendario() {
  return (
    <TabsHub
      title="Calendário e Programação"
      description="Escalas diárias, folgas e feriados."
      tabs={[
        { value: "escalas", label: "Programação Diária", icon: CalendarRange, content: <Escalas /> },
        { value: "folgas", label: "Folgas e Ausências", icon: CalendarDays, content: <CalendarioFolgas /> },
        { value: "feriados", label: "Feriados", icon: Sun, content: <Feriados /> },
      ]}
    />
  );
}