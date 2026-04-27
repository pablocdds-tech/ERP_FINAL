import { MessageSquare } from "lucide-react";
import PwaSimplePage from "./PwaSimplePage";

export default function PwaChamados() {
  return (
    <PwaSimplePage
      titulo="Chamados"
      descricao="Abra um chamado, envie fotos ou faça uma solicitação."
      icon={MessageSquare}
      itens={["Abrir chamado", "Enviar foto", "Solicitar folga", "Justificar falta", "Meus chamados"]}
    />
  );
}