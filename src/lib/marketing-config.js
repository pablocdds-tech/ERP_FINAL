import {
  Megaphone, Ticket, Users, BarChart3, Repeat, Trophy,
  UserX, Send, TrendingUp, Heart,
} from "lucide-react";

export const MARKETING_LIST = [
  { tipo: "crm", nome: "CRM de Clientes", descricao: "Jornada do cliente: sabores, dias preferidos, LTV e listas para ofertas.", icon: Heart },
  { tipo: "campanhas", nome: "Campanhas", descricao: "Crie e acompanhe campanhas com vigência e meta.", icon: Megaphone },
  { tipo: "cupons", nome: "Cupons", descricao: "Cupons de desconto com regras por canal e loja.", icon: Ticket },
  { tipo: "clientes", nome: "Clientes", descricao: "Base de clientes com tags e histórico.", icon: Users },
  { tipo: "ranking", nome: "Ranking de Clientes", descricao: "Top clientes por gasto e frequência.", icon: Trophy },
  { tipo: "performance", nome: "Performance por Canal", descricao: "Receita, pedidos e ticket médio por canal.", icon: BarChart3 },
  { tipo: "recorrencia", nome: "Recorrência", descricao: "Clientes recorrentes e ticket médio geral.", icon: Repeat },
  { tipo: "inativos", nome: "Clientes Inativos", descricao: "Quem não volta há mais de 60 dias.", icon: UserX },
  { tipo: "disparos", nome: "Disparos WhatsApp", descricao: "Mensagens em massa via WhatsApp/n8n.", icon: Send },
  { tipo: "indicadores", nome: "Indicadores", descricao: "Visão consolidada de marketing.", icon: TrendingUp },
];