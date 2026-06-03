// Configuração de permissões e agrupamentos do módulo de Roteirização.

// Permissões por perfil (role do User: admin/gestor/operador).
export function getDeliveryPerms(role) {
  const r = role || "operador";
  const perms = {
    admin: { criar: true, editar: true, despachar: true, concluir: true, cancelar: true, alterarMotoboy: true, verLogs: true, configurar: true },
    gestor: { criar: true, editar: true, despachar: true, concluir: true, cancelar: false, alterarMotoboy: true, verLogs: true, configurar: true },
    operador: { criar: true, editar: true, despachar: false, concluir: false, cancelar: false, alterarMotoboy: false, verLogs: false, configurar: false },
  };
  return perms[r] || perms.operador;
}

// Grupos visuais de pedidos pendentes no painel.
export const GRUPOS_PENDENTES = [
  { key: "sem_coord", label: "Sem coordenada", match: (p) => p.latitude == null || p.longitude == null },
  { key: "cozinha", label: "Cozinha (em preparo)", match: (p) => p.status_pedido === "em_preparo" || p.status_pedido === "novo" },
  { key: "pronto", label: "Pronto para entrega", match: (p) => p.status_pedido === "pronto" },
];

// Distribui os pedidos nos grupos (cada pedido em apenas um grupo, prioridade da lista).
export function agruparPendentes(pedidos) {
  const usados = new Set();
  return GRUPOS_PENDENTES.map((g) => {
    const itens = pedidos.filter((p) => !usados.has(p.id) && g.match(p));
    itens.forEach((p) => usados.add(p.id));
    return { ...g, itens };
  }).filter((g) => g.itens.length > 0);
}