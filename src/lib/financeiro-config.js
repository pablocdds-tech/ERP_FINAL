import {
  ArrowDownCircle, ArrowUpCircle, Building2, Banknote, Repeat,
  TrendingUp, FileUp, ShieldCheck, Network, Receipt, History, Users,
} from "lucide-react";

export const FINANCEIRO_REAL_LIST = [
  { slug: "contas-pagar", title: "Contas a Pagar", icon: ArrowUpCircle, descricao: "Lance, baixe e acompanhe contas a pagar." },
  { slug: "contas-receber", title: "Contas a Receber", icon: ArrowDownCircle, descricao: "Lance e baixe recebimentos." },
  { slug: "contas-bancarias", title: "Contas Bancárias", icon: Building2, descricao: "Cadastro de contas (PJ e PF) e saldos." },
  { slug: "movimentacoes", title: "Movimentações Bancárias", icon: Banknote, descricao: "Extrato de cada conta." },
  { slug: "fluxo-caixa", title: "Fluxo de Caixa", icon: TrendingUp, descricao: "Realizado e previsto, por loja." },
  { slug: "importar-ofx", title: "Importação OFX", icon: FileUp, descricao: "Importe extratos bancários." },
  { slug: "conciliacao", title: "Conciliação Bancária", icon: ShieldCheck, descricao: "Marque movimentações como conferidas." },
  { slug: "pf-pj", title: "Transição PF x PJ", icon: Users, descricao: "Painel de mistura sócio x empresa, alertas e saldo PF/PJ." },
];

export const FINANCEIRO_VIRTUAL_LIST = [
  { slug: "interno-saldos", title: "Saldos Virtuais", icon: Network, descricao: "Saldo entre CD e cada loja." },
  { slug: "interno-lancamentos", title: "Lançamentos Internos", icon: Repeat, descricao: "Débitos e créditos CD ↔ loja." },
  { slug: "interno-cupom", title: "Cupons de Conferência", icon: Receipt, descricao: "Cupom impresso da liquidação." },
  { slug: "interno-historico", title: "Histórico Interno", icon: History, descricao: "Toda movimentação interna." },
];

export const getFinanceiroSubmodulo = (slug) =>
  [...FINANCEIRO_REAL_LIST, ...FINANCEIRO_VIRTUAL_LIST].find((s) => s.slug === slug);