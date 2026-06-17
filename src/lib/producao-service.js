import { base44 } from "@/api/base44Client";

// Serviço do KDS de produção (mesas/garçom). Lê producao_pedido, que é
// criado já roteado por setor (cozinha/pizzaria/bar) ao "Enviar cozinha".

export const SETORES_PRODUCAO = [
  { value: "cozinha", label: "Cozinha", icon: "ChefHat" },
  { value: "pizzaria", label: "Pizzaria", icon: "Pizza" },
  { value: "bar", label: "Bar", icon: "Wine" },
];

export const producaoService = {
  // Pedidos ativos de um setor (enviado / em produção / pronto).
  listAtivos: async (setor, lojaId) => {
    const query = { status: { $in: ["enviado", "em_producao", "pronto"] } };
    if (setor) query.setor = setor;
    if (lojaId) query.loja_id = lojaId;
    return base44.entities.producao_pedido.filter(query, "enviado_em", 200);
  },

  // Avança o status: enviado → em_producao → pronto → entregue.
  avancar: async (pedido) => {
    const fluxo = ["enviado", "em_producao", "pronto", "entregue"];
    const idx = fluxo.indexOf(pedido.status);
    if (idx === -1 || idx === fluxo.length - 1) return pedido;
    const prox = fluxo[idx + 1];
    const patch = { status: prox };
    if (prox === "entregue") patch.finalizado_em = new Date().toISOString();
    return base44.entities.producao_pedido.update(pedido.id, patch);
  },

  subscribe: (callback) => base44.entities.producao_pedido.subscribe(callback),
};