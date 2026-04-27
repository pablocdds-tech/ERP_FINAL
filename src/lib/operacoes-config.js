import {
  ShoppingBag, FileText, Boxes, ArrowLeftRight, SlidersHorizontal,
  AlertTriangle, FileCog, Factory, ClipboardList, History,
} from "lucide-react";

// Lista declarativa dos submódulos de Operações.
// Cada um aponta para sua sub-rota dentro de /operacoes.
export const OPERACOES_LIST = [
  { slug: "compras", title: "Compras", icon: ShoppingBag, descricao: "Lance compras e gere entradas de estoque." },
  { slug: "notas-fiscais", title: "Notas Fiscais", icon: FileText, descricao: "Notas vinculadas a fornecedores." },
  { slug: "estoque", title: "Estoque", icon: Boxes, descricao: "Saldos por loja/CD." },
  { slug: "transferencias", title: "Transferências", icon: ArrowLeftRight, descricao: "Movimente itens entre unidades." },
  { slug: "ajustes-perdas", title: "Ajustes e Perdas", icon: SlidersHorizontal, descricao: "Acertos de saldo e perdas." },
  { slug: "fichas-tecnicas", title: "Fichas Técnicas", icon: FileCog, descricao: "Receita de produtos com insumos." },
  { slug: "ordens-producao", title: "Ordens de Produção", icon: Factory, descricao: "Produção do CD e das lojas." },
  { slug: "inventarios", title: "Inventários", icon: ClipboardList, descricao: "Contagens cíclicas." },
  { slug: "movimentacoes", title: "Histórico de Movimentações", icon: History, descricao: "Toda movimentação de estoque." },
];

export const getOperacao = (slug) => OPERACOES_LIST.find((o) => o.slug === slug);