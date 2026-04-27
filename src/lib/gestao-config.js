import {
  LayoutDashboard, FileBarChart, Calculator, Percent,
  Store, Building2, FileText, Wallet, GitCompare, Bell,
} from "lucide-react";

export const GESTAO_LIST = [
  { tipo: "dashboard", nome: "Dashboard Geral", descricao: "Visão executiva com os principais indicadores.", icon: LayoutDashboard },
  { tipo: "dre", nome: "DRE Gerencial", descricao: "Receitas, CMV, despesas e resultado por período.", icon: FileBarChart },
  { tipo: "cmv", nome: "CMV", descricao: "Custo da mercadoria vendida por loja e produto.", icon: Calculator },
  { tipo: "margem", nome: "Margem por Produto", descricao: "Margem bruta de cada produto a partir da ficha técnica.", icon: Percent },
  { tipo: "resultado-loja", nome: "Resultado por Loja", descricao: "DRE individual de cada loja.", icon: Store },
  { tipo: "consolidado", nome: "Consolidado", descricao: "Resultado de todas as lojas somadas.", icon: Building2 },
  { tipo: "comparativo", nome: "Comparativo entre Lojas", descricao: "Comparação lado a lado de receita, CMV e resultado.", icon: GitCompare },
  { tipo: "relatorios-operacionais", nome: "Relatórios Operacionais", descricao: "Vendas, ticket médio, canais e horários.", icon: FileText },
  { tipo: "relatorios-financeiros", nome: "Relatórios Financeiros", descricao: "Contas a pagar/receber, fluxo e categorias.", icon: Wallet },
  { tipo: "alertas", nome: "Alertas Inteligentes", descricao: "Indicadores fora do padrão exigem atenção.", icon: Bell },
];