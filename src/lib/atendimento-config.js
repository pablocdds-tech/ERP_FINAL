import {
  MessageSquareWarning, Star, Smile, AlertOctagon,
  Gift, Undo2, Wrench, History, BarChart3,
} from "lucide-react";

export const ATENDIMENTO_LIST = [
  { tipo: "reclamacoes", nome: "Reclamações", descricao: "Registro e tratativa de reclamações de clientes.", icon: MessageSquareWarning },
  { tipo: "tratativas", nome: "Tratativas", descricao: "Reclamações em andamento aguardando solução.", icon: Wrench },
  { tipo: "avaliacoes", nome: "Avaliações", descricao: "Notas e comentários de clientes (iFood, Google, etc.).", icon: Star },
  { tipo: "nps", nome: "NPS", descricao: "Pesquisa de satisfação com cálculo de NPS.", icon: Smile },
  { tipo: "ocorrencias-pedido", nome: "Ocorrências de Pedido", descricao: "Problemas pontuais em pedidos específicos.", icon: AlertOctagon },
  { tipo: "cortesias", nome: "Cortesias", descricao: "Brindes e cortesias concedidas.", icon: Gift },
  { tipo: "reembolsos", nome: "Reembolsos", descricao: "Devoluções de valores aos clientes.", icon: Undo2 },
  { tipo: "historico", nome: "Histórico por Cliente", descricao: "Linha do tempo de problemas por cliente.", icon: History },
  { tipo: "indicadores", nome: "Indicadores", descricao: "Motivos recorrentes, tempo de resposta e SLA.", icon: BarChart3 },
];

export const MOTIVOS_RECLAMACAO = [
  { v: "atraso_entrega", l: "Atraso na entrega" },
  { v: "produto_errado", l: "Produto errado" },
  { v: "produto_faltando", l: "Item faltando" },
  { v: "qualidade_produto", l: "Qualidade do produto" },
  { v: "temperatura", l: "Temperatura" },
  { v: "atendimento", l: "Atendimento" },
  { v: "higiene", l: "Higiene" },
  { v: "preco_cobranca", l: "Preço/cobrança" },
  { v: "embalagem", l: "Embalagem" },
  { v: "outro", l: "Outro" },
];

export const STATUS_TRATATIVA = [
  { v: "aberta", l: "Aberta", cor: "bg-red-100 text-red-700" },
  { v: "em_tratativa", l: "Em tratativa", cor: "bg-amber-100 text-amber-700" },
  { v: "aguardando_cliente", l: "Aguardando cliente", cor: "bg-blue-100 text-blue-700" },
  { v: "resolvida", l: "Resolvida", cor: "bg-emerald-100 text-emerald-700" },
  { v: "improcedente", l: "Improcedente", cor: "bg-slate-100 text-slate-700" },
  { v: "cancelada", l: "Cancelada", cor: "bg-muted text-muted-foreground" },
];

export const TIPOS_SOLUCAO = [
  { v: "nenhuma", l: "Nenhuma" },
  { v: "cortesia", l: "Cortesia" },
  { v: "reembolso", l: "Reembolso" },
  { v: "reentrega", l: "Reentrega" },
  { v: "desconto_proximo", l: "Desconto na próxima" },
  { v: "pedido_desculpas", l: "Pedido de desculpas" },
  { v: "outro", l: "Outro" },
];

export const CANAIS_ORIGEM = [
  "whatsapp", "telefone", "presencial", "ifood", "instagram", "google", "email", "outro",
];

export const motivoLabel = (v) => MOTIVOS_RECLAMACAO.find((m) => m.v === v)?.l || v;
export const statusInfo = (v) => STATUS_TRATATIVA.find((s) => s.v === v) || { l: v, cor: "bg-muted" };