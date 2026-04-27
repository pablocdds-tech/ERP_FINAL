import { Calendar } from "lucide-react";
import PwaSimplePage from "./PwaSimplePage";

export default function PwaEscala() {
  return (
    <PwaSimplePage
      titulo="Minha Escala"
      descricao="Visualize sua escala da semana e do mês."
      icon={Calendar}
      itens={["Esta semana", "Próxima semana", "Mês completo", "Solicitar folga", "Trocar turno"]}
    />
  );
}