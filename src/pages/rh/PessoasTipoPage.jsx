import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Colaboradores from "./Colaboradores";
import Cargos from "./Cargos";
import Departamentos from "./Departamentos";
import Times from "./Times";
import Jornadas from "./Jornadas";
import Turnos from "./Turnos";
import Feriados from "./Feriados";
import TiposAbono from "./TiposAbono";
import Escalas from "./Escalas";
import EspelhoPonto from "./EspelhoPonto";
import Solicitacoes from "./Solicitacoes";
import Documentos from "./Documentos";
import Treinamentos from "./Treinamentos";
import Tarefas from "./Tarefas";
import Checklists from "./Checklists";
import Chamados from "./Chamados";
import ConfiguracaoPonto from "./ConfiguracaoPonto";
import KioskDispositivos from "./KioskDispositivos";
import FechamentoMensal from "./FechamentoMensal";
import PontoDoDia from "./PontoDoDia";
import PontosPendentes from "./PontosPendentes";
import TratamentoPonto from "./TratamentoPonto";
import PainelIndicadores from "./PainelIndicadores";
import Justificativas from "./Justificativas";
import CalendarioFolgas from "./CalendarioFolgas";
import BancoHorasGestao from "./BancoHorasGestao";
import RelCartaoPonto from "./RelCartaoPonto";
import RelFaltasAtrasos from "./RelFaltasAtrasos";
import RelHorasExtras from "./RelHorasExtras";
import RelTotalizadoresFolha from "./RelTotalizadoresFolha";

const PAGES = {
  colaboradores: Colaboradores,
  cargos: Cargos,
  departamentos: Departamentos,
  times: Times,
  jornadas: Jornadas,
  turnos: Turnos,
  feriados: Feriados,
  abonos: TiposAbono,
  escalas: Escalas,
  ponto: EspelhoPonto,
  "configuracao-ponto": ConfiguracaoPonto,
  "kiosk-dispositivos": KioskDispositivos,
  fechamento: FechamentoMensal,
  "ponto-do-dia": PontoDoDia,
  pendentes: PontosPendentes,
  tratamento: TratamentoPonto,
  solicitacoes: Solicitacoes,
  documentos: Documentos,
  treinamentos: Treinamentos,
  tarefas: Tarefas,
  checklists: Checklists,
  chamados: Chamados,
  indicadores: PainelIndicadores,
  justificativas: Justificativas,
  folgas: CalendarioFolgas,
  "banco-horas-gestao": BancoHorasGestao,
  "rel-cartao-ponto": RelCartaoPonto,
  "rel-faltas-atrasos": RelFaltasAtrasos,
  "rel-horas-extras": RelHorasExtras,
  "rel-totalizadores-folha": RelTotalizadoresFolha,
};

export default function PessoasTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}