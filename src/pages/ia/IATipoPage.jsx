import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Agents from "./Agents";
import Logs from "./Logs";
import Eventos from "./Eventos";
import Integracoes from "./Integracoes";
import N8N from "./N8N";
import Whatsapp from "./Whatsapp";
import Fila from "./Fila";
import Respostas from "./Respostas";
import Falhas from "./Falhas";
import Aprovacoes from "./Aprovacoes";

const PAGES = {
  agents: Agents,
  logs: Logs,
  eventos: Eventos,
  integracoes: Integracoes,
  n8n: N8N,
  whatsapp: Whatsapp,
  fila: Fila,
  respostas: Respostas,
  falhas: Falhas,
  aprovacoes: Aprovacoes,
};

export default function IATipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}