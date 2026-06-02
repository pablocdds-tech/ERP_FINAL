import { base44 } from "@/api/base44Client";

// Serviço do módulo PDV — pedidos unificados de múltiplos canais.

export const PDV_STATUS = [
  { value: "novo", label: "Novo", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "em_preparo", label: "Em preparo", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "pronto", label: "Pronto", cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "em_entrega", label: "Em entrega", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "concluido", label: "Concluído", cor: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "cancelado", label: "Cancelado", cor: "bg-red-100 text-red-700 border-red-200" },
];

export const PDV_CANAIS = {
  cardapio_web: "Cardápio Web",
  ifood: "iFood",
  balcao: "Balcão",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

// Próximo status no fluxo (delivery vs retirada/balcão)
export function proximoStatus(pedido) {
  const fluxoDelivery = ["novo", "em_preparo", "pronto", "em_entrega", "concluido"];
  const fluxoLocal = ["novo", "em_preparo", "pronto", "concluido"];
  const fluxo = pedido.tipo_entrega === "delivery" ? fluxoDelivery : fluxoLocal;
  const idx = fluxo.indexOf(pedido.status);
  if (idx === -1 || idx === fluxo.length - 1) return null;
  return fluxo[idx + 1];
}

export function getStatusInfo(value) {
  return PDV_STATUS.find((s) => s.value === value) || PDV_STATUS[0];
}

export const pdvService = {
  listAtivos: async (lojaId) => {
    const query = { status: { $in: ["novo", "em_preparo", "pronto", "em_entrega"] } };
    if (lojaId) query.loja_id = lojaId;
    return base44.entities.pdv_pedido.filter(query, "-recebido_em", 200);
  },

  list: async (query = {}, limit = 100) => {
    return base44.entities.pdv_pedido.filter(query, "-recebido_em", limit);
  },

  criar: async (dados) => {
    return base44.entities.pdv_pedido.create({
      recebido_em: new Date().toISOString(),
      status: "novo",
      ...dados,
    });
  },

  mudarStatus: async (pedido, novoStatus) => {
    const patch = { status: novoStatus };
    const agora = new Date().toISOString();
    if (novoStatus === "em_preparo" && !pedido.aceito_em) patch.aceito_em = agora;
    if (novoStatus === "pronto" && !pedido.pronto_em) patch.pronto_em = agora;
    if (novoStatus === "concluido") patch.concluido_em = agora;
    return base44.entities.pdv_pedido.update(pedido.id, patch);
  },

  avancar: async (pedido) => {
    const prox = proximoStatus(pedido);
    if (!prox) return pedido;
    return pdvService.mudarStatus(pedido, prox);
  },

  cancelar: async (pedido, motivo) => {
    return base44.entities.pdv_pedido.update(pedido.id, {
      status: "cancelado",
      cancelado_motivo: motivo || "",
    });
  },

  subscribe: (callback) => base44.entities.pdv_pedido.subscribe(callback),
};