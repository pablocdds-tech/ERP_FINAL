import {
  MonitorSmartphone, ChefHat, Utensils, ShoppingBag, ListChecks, Users, Soup,
} from "lucide-react";

// Submódulos do PDV. "to" absoluto quando a tela já existe fora do roteador de tipo.
export const PDV_LIST = [
  { slug: "painel", title: "Painel de Pedidos", icon: MonitorSmartphone, descricao: "Pedidos ao vivo de todos os canais.", to: "/admin/pdv/painel" },
  { slug: "kds", title: "Cozinha — KDS", icon: ChefHat, descricao: "Tela de produção da cozinha.", to: "/admin/kds" },
  { slug: "kds-producao", title: "KDS Mesas (Setores)", icon: Soup, descricao: "Pedidos do garçom por setor: cozinha, pizzaria e bar.", to: "/admin/kds-producao" },
  { slug: "cardapio-web", title: "Integração Cardápio Web", icon: Utensils, descricao: "Conecte o Cardápio Web e configure o webhook." },
  { slug: "pedidos-importados", title: "Pedidos Importados", icon: ShoppingBag, descricao: "Pedidos recebidos do Cardápio Web." },
  { slug: "resumo-cardapio-web", title: "Resumo Cardápio Web", icon: ListChecks, descricao: "Resumo por loja, data e forma de pagamento." },
];

export const getPdvSubmodulo = (slug) => PDV_LIST.find((s) => s.slug === slug);