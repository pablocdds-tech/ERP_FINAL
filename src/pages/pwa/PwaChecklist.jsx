import { ListChecks } from "lucide-react";
import PwaSimplePage from "./PwaSimplePage";

export default function PwaChecklist() {
  return (
    <PwaSimplePage
      titulo="Checklists"
      descricao="Cumpra as rotinas do seu turno."
      icon={ListChecks}
      itens={["Abertura da loja", "Limpeza do salão", "Conferência do estoque", "Fechamento"]}
    />
  );
}