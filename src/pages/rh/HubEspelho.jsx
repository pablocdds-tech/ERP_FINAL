import { Clock, Timer } from "lucide-react";
import TabsHub from "@/components/rh/TabsHub";
import EspelhoPonto from "./EspelhoPonto";
import BancoHorasGestao from "./BancoHorasGestao";

export default function HubEspelho() {
  return (
    <TabsHub
      title="Espelho de Ponto"
      description="Registros do colaborador e saldo de banco de horas."
      tabs={[
        { value: "espelho", label: "Espelho de Ponto", icon: Clock, content: <EspelhoPonto /> },
        { value: "banco-horas", label: "Banco de Horas", icon: Timer, content: <BancoHorasGestao /> },
      ]}
    />
  );
}