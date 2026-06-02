import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";

import ContasPagar from "./ContasPagar";
import ContasReceber from "./ContasReceber";
import ContasBancarias from "./ContasBancarias";
import MovimentacoesBancarias from "./MovimentacoesBancarias";
import FluxoCaixa from "./FluxoCaixa";
import ImportarOFX from "./ImportarOFX";
import Conciliacao from "./Conciliacao";
import FuncionariosWhatsapp from "./FuncionariosWhatsapp";
import InboxFinanceiroWhatsapp from "./InboxFinanceiroWhatsapp";

import InternoSaldos from "./InternoSaldos";
import InternoLancamentos from "./InternoLancamentos";
import InternoCupom from "./InternoCupom";
import InternoHistorico from "./InternoHistorico";

import PfPjDashboard from "./PfPjDashboard";
import PfPjLancamento from "./PfPjLancamento";
import PfPjResumo from "./PfPjResumo";

const PAGES = {
  "real/contas-pagar": ContasPagar,
  "real/contas-receber": ContasReceber,
  "real/contas-bancarias": ContasBancarias,
  "real/movimentacoes": MovimentacoesBancarias,
  "real/fluxo-caixa": FluxoCaixa,
  "real/importar-ofx": ImportarOFX,
  "real/conciliacao": Conciliacao,
  "real/funcionarios-whatsapp": FuncionariosWhatsapp,
  "real/inbox-whatsapp": InboxFinanceiroWhatsapp,
  "real/pf-pj": PfPjDashboard,
  "real/pf-pj-lancamento": PfPjLancamento,
  "real/pf-pj-resumo": PfPjResumo,

  "virtual/interno-saldos": InternoSaldos,
  "virtual/interno-lancamentos": InternoLancamentos,
  "virtual/interno-cupom": InternoCupom,
  "virtual/interno-historico": InternoHistorico,
};

export default function FinanceiroTipoPage() {
  const { area, tipo } = useParams();
  const Comp = PAGES[`${area}/${tipo}`];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}