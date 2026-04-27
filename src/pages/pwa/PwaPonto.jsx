import { Clock } from "lucide-react";
import PwaSimplePage from "./PwaSimplePage";

export default function PwaPonto() {
  return (
    <PwaSimplePage
      titulo="Ponto Eletrônico"
      descricao="Registre entrada, intervalo e saída."
      icon={Clock}
      itens={["Entrada", "Início do intervalo", "Fim do intervalo", "Saída", "Justificar atraso"]}
    />
  );
}