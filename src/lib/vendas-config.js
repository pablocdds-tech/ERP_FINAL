import { ClipboardCheck, BarChart3, ArrowDownUp, Wallet, Calendar } from "lucide-react";

// Submódulos de Vendas e Caixa
export const VENDAS_LIST = [
  { slug: "fechamentos", title: "Fechamentos diários", icon: ClipboardCheck, descricao: "Lance e confira o caixa de cada loja por dia." },
  { slug: "conferencia", title: "Conferência por pagamento", icon: BarChart3, descricao: "Compare o declarado com o conferido pelo gestor." },
  { slug: "sangrias", title: "Sangrias e despesas", icon: ArrowDownUp, descricao: "Histórico de retiradas e despesas pagas em caixa." },
  { slug: "recebiveis", title: "Recebíveis previstos", icon: Wallet, descricao: "Valores futuros (cartão, iFood etc) por data prevista." },
  { slug: "calendario", title: "Calendário de vendas", icon: Calendar, descricao: "Visão por loja e por dia." },
];

export const getVendaSubmodulo = (slug) => VENDAS_LIST.find((v) => v.slug === slug);