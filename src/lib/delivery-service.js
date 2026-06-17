import { base44 } from "@/api/base44Client";
import { fmtMoeda } from "@/lib/format";

// Reexportado do util central para compatibilidade.
export { fmtMoeda };

// =====================================================================
// Serviço de Roteirização de Entregas.
// Normaliza pedidos de múltiplas origens (PDV, Cardápio Web, externos),
// gerencia rotas, geocodificação (Nominatim/OSM gratuito), otimização
// nearest-neighbor e logs.
// =====================================================================

export const ROUTE_STATUS = [
  { value: "criada", label: "Criada", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "aguardando_saida", label: "Aguardando saída", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "despachada", label: "Despachada", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "em_andamento", label: "Em andamento", cor: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "concluida", label: "Concluída", cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "cancelada", label: "Cancelada", cor: "bg-red-100 text-red-700 border-red-200" },
];

export const DELIVERY_STATUS = [
  { value: "pendente", label: "Pendente", cor: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "em_rota", label: "Em rota", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "entregue", label: "Entregue", cor: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "cliente_ausente", label: "Cliente ausente", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "endereco_errado", label: "Endereço errado", cor: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "pagamento_recusado", label: "Pagamento recusado", cor: "bg-red-100 text-red-700 border-red-200" },
  { value: "pedido_devolvido", label: "Devolvido", cor: "bg-red-100 text-red-700 border-red-200" },
  { value: "problema_entrega", label: "Problema", cor: "bg-red-100 text-red-700 border-red-200" },
];

export const ORIGENS = {
  pdv: "PDV",
  cardapio_web: "Cardápio Web",
  ifood: "iFood",
  saipos: "Saipos",
  manual: "Manual",
};



export const getRouteStatus = (v) => ROUTE_STATUS.find((s) => s.value === v) || ROUTE_STATUS[0];
export const getDeliveryStatus = (v) => DELIVERY_STATUS.find((s) => s.value === v) || DELIVERY_STATUS[0];

// Classifica forma de pagamento em dinheiro / cartão-pix presencial / online
function classificarPagamento(forma) {
  const f = String(forma || "").toLowerCase();
  if (/dinheiro|cash|especie/.test(f)) return "dinheiro";
  if (/online|pago|prepaid|app/.test(f)) return "online";
  return "offline"; // cartão/pix na entrega
}

// minutos aguardando desde a criação
export function minutosAguardando(criadoEm) {
  if (!criadoEm) return 0;
  const ms = Date.now() - new Date(criadoEm).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

// ------------- Normalização -------------
// Converte pdv_pedido para o formato normalizado de roteirização.
function normalizarPdv(p) {
  return {
    id: p.id,
    origem: p.canal === "cardapio_web" ? "cardapio_web" : (p.canal === "ifood" ? "ifood" : (["balcao", "telefone", "whatsapp", "outro"].includes(p.canal) ? "manual" : p.canal || "pdv")),
    external_id: p.origem_id || "",
    numero_pedido: p.numero_pedido || p.id?.slice(-5) || "",
    cliente_nome: p.cliente_nome || "Cliente",
    cliente_telefone: p.cliente_telefone || "",
    endereco_completo: p.endereco_entrega || "",
    bairro: p.bairro || "",
    cidade: "",
    estado: "",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    total: Number(p.total || 0),
    forma_pagamento: p.forma_pagamento || "",
    classe_pagamento: classificarPagamento(p.forma_pagamento),
    status_pedido: p.status,
    pronto_para_entrega: p.status === "pronto",
    tipo_entrega: p.tipo_entrega || "delivery",
    criado_em: p.recebido_em || p.created_date,
  };
}

export const deliveryService = {
  // Pedidos de delivery ainda não roteirizados (não estão em rota ativa).
  listPendentes: async (lojaId) => {
    const query = {
      tipo_entrega: "delivery",
      status: { $in: ["novo", "em_preparo", "pronto"] },
    };
    if (lojaId) query.loja_id = lojaId;
    const pedidos = await base44.entities.pdv_pedido.filter(query, "-recebido_em", 300);

    // IDs de pedidos já em rota ativa (não concluída/cancelada)
    const rotasAtivas = await base44.entities.delivery_routes.filter(
      { status: { $in: ["criada", "aguardando_saida", "despachada", "em_andamento"] } }, "-created_date", 200
    );
    const idsEmRota = new Set();
    if (rotasAtivas.length > 0) {
      const ros = await base44.entities.delivery_route_orders.filter(
        { route_id: { $in: rotasAtivas.map((r) => r.id) } }, "-created_date", 1000
      );
      ros.forEach((ro) => idsEmRota.add(ro.pedido_id));
    }

    return pedidos
      .filter((p) => !idsEmRota.has(p.id))
      .map(normalizarPdv);
  },

  // ------------- Drivers -------------
  listDrivers: async (lojaId) => {
    const query = { active: true };
    if (lojaId) query.loja_id = lojaId;
    return base44.entities.delivery_drivers.filter(query, "name", 100);
  },

  // ------------- Settings -------------
  getSettings: async (lojaId) => {
    const q = lojaId ? { loja_id: lojaId } : {};
    const list = await base44.entities.delivery_settings.filter(q, "-created_date", 1);
    return list[0] || null;
  },
  saveSettings: async (lojaId, dados) => {
    const existing = await deliveryService.getSettings(lojaId);
    if (existing) return base44.entities.delivery_settings.update(existing.id, dados);
    return base44.entities.delivery_settings.create({ loja_id: lojaId || "", ...dados });
  },

  // ------------- Rotas -------------
  listRotas: async (lojaId) => {
    const q = lojaId ? { loja_id: lojaId } : {};
    return base44.entities.delivery_routes.filter(q, "-created_date", 200);
  },
  getRotaOrders: async (routeId) => {
    return base44.entities.delivery_route_orders.filter({ route_id: routeId }, "sequence", 200);
  },

  // Cria rota a partir de uma lista de pedidos normalizados já ordenados.
  criarRota: async ({ lojaId, motoboy, pedidos, origem, settings }) => {
    const seq = await proximoNumeroRota();
    const dist = estimarDistanciaKm(origem, pedidos);
    const dur = estimarDuracaoMin(pedidos.length, dist, settings);
    const totais = somarTotais(pedidos);
    const bairros = [...new Set(pedidos.map((p) => p.bairro).filter(Boolean))];

    const rota = await base44.entities.delivery_routes.create({
      loja_id: lojaId || "",
      route_number: seq,
      motoboy_id: motoboy?.id || "",
      motoboy_name: motoboy?.name || "",
      status: "criada",
      origin_latitude: origem?.lat ?? null,
      origin_longitude: origem?.lng ?? null,
      origin_address: origem?.address || "",
      estimated_distance_km: dist,
      estimated_duration_minutes: dur,
      total_orders: pedidos.length,
      total_amount: totais.total,
      total_cash_to_collect: totais.dinheiro,
      total_card_offline: totais.offline,
      total_online_paid: totais.online,
      neighborhoods: bairros,
    });

    for (let i = 0; i < pedidos.length; i++) {
      const p = pedidos[i];
      await base44.entities.delivery_route_orders.create({
        route_id: rota.id,
        pedido_id: p.id,
        origem: p.origem,
        external_order_id: p.external_id || "",
        sequence: i + 1,
        numero_pedido: p.numero_pedido,
        customer_name: p.cliente_nome,
        customer_phone: p.cliente_telefone,
        address: p.endereco_completo,
        neighborhood: p.bairro,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        order_total: p.total,
        payment_method: p.forma_pagamento,
        payment_status: p.classe_pagamento === "online" ? "online_pago" : "a_receber",
        delivery_status: "pendente",
      });
    }
    await deliveryService.log(rota.id, null, "criar_rota", `Rota ${seq} criada com ${pedidos.length} pedido(s).`);
    return rota;
  },

  // Reordena os pedidos da rota (lista de {id, sequence}).
  reordenar: async (routeId, ordens) => {
    for (const o of ordens) {
      await base44.entities.delivery_route_orders.update(o.id, { sequence: o.sequence });
    }
    await deliveryService.log(routeId, null, "alterar_sequencia", "Sequência de entregas reordenada.");
  },

  removerPedido: async (routeId, routeOrder, despachada) => {
    await base44.entities.delivery_route_orders.delete(routeOrder.id);
    await deliveryService.log(routeId, routeOrder.pedido_id, "remover_pedido",
      `Pedido ${routeOrder.numero_pedido} removido da rota${despachada ? " (após despacho)" : ""}.`);
  },

  alterarMotoboy: async (rota, motoboy) => {
    await base44.entities.delivery_routes.update(rota.id, { motoboy_id: motoboy?.id || "", motoboy_name: motoboy?.name || "" });
    await deliveryService.log(rota.id, null, "alterar_motoboy", `Motoboy alterado para ${motoboy?.name || "—"}.`);
  },

  // Despacha a rota: pedidos -> em_rota / em_entrega, rota -> em_andamento.
  despachar: async (rota) => {
    const orders = await deliveryService.getRotaOrders(rota.id);
    for (const ro of orders) {
      await base44.entities.delivery_route_orders.update(ro.id, { delivery_status: "em_rota" });
      // Atualiza o pedido de origem no PDV
      await base44.entities.pdv_pedido.update(ro.pedido_id, { status: "em_entrega" }).catch(() => {});
    }
    await base44.entities.delivery_routes.update(rota.id, {
      status: "em_andamento",
      started_at: new Date().toISOString(),
    });
    await deliveryService.log(rota.id, null, "despachar", `Rota ${rota.route_number} despachada com ${orders.length} pedido(s).`);
  },

  marcarEntrega: async (routeOrder, status, motivo) => {
    const patch = { delivery_status: status };
    if (status === "entregue") {
      patch.delivered_at = new Date().toISOString();
      await base44.entities.pdv_pedido.update(routeOrder.pedido_id, { status: "concluido", concluido_em: new Date().toISOString() }).catch(() => {});
    } else if (status !== "em_rota" && status !== "pendente") {
      patch.problem_reason = motivo || status;
    }
    await base44.entities.delivery_route_orders.update(routeOrder.id, patch);
    const acao = status === "entregue" ? "pedido_entregue" : "problema_entrega";
    await deliveryService.log(routeOrder.route_id, routeOrder.pedido_id, acao,
      `Pedido ${routeOrder.numero_pedido}: ${getDeliveryStatus(status).label}${motivo ? ` (${motivo})` : ""}.`);
  },

  concluirRota: async (rota) => {
    const orders = await deliveryService.getRotaOrders(rota.id);
    const divergencias = orders.filter((o) => !["entregue"].includes(o.delivery_status) && o.delivery_status !== "em_rota").length;
    const finished = new Date().toISOString();
    const real = rota.started_at ? Math.round((Date.now() - new Date(rota.started_at).getTime()) / 60000) : null;
    await base44.entities.delivery_routes.update(rota.id, {
      status: "concluida",
      finished_at: finished,
      real_duration_minutes: real,
    });
    await deliveryService.log(rota.id, null, "concluir_rota",
      `Rota ${rota.route_number} concluída. ${divergencias} divergência(s). Tempo real: ${real ?? "—"}min.`);
  },

  cancelarRota: async (rota, motivo) => {
    const orders = await deliveryService.getRotaOrders(rota.id);
    // Devolve pedidos não entregues ao fluxo
    for (const ro of orders) {
      if (ro.delivery_status !== "entregue") {
        await base44.entities.pdv_pedido.update(ro.pedido_id, { status: "pronto" }).catch(() => {});
      }
    }
    await base44.entities.delivery_routes.update(rota.id, { status: "cancelada", notes: motivo || "" });
    await deliveryService.log(rota.id, null, "cancelar_rota", `Rota ${rota.route_number} cancelada. ${motivo || ""}`);
  },

  // ------------- Logs -------------
  log: async (routeId, pedidoId, action, description, metadata) => {
    let email = "";
    try { const u = await base44.auth.me(); email = u?.email || ""; } catch { /* ignore */ }
    return base44.entities.delivery_logs.create({
      route_id: routeId || "",
      pedido_id: pedidoId || "",
      action,
      description,
      user_email: email,
      metadata: metadata ? JSON.stringify(metadata) : "",
    });
  },
  listLogs: async (routeId) => {
    return base44.entities.delivery_logs.filter({ route_id: routeId }, "-created_date", 100);
  },
};

// ------------- Numeração de rota -------------
async function proximoNumeroRota() {
  const ultimas = await base44.entities.delivery_routes.list("-created_date", 1);
  const n = ultimas.length;
  const seq = (n > 0 ? parseInt((ultimas[0].route_number || "R-0").replace(/\D/g, ""), 10) || 0 : 0) + 1;
  return `R-${String(seq).padStart(4, "0")}`;
}

// ------------- Geometria / Otimização -------------
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Ordena pedidos pelo vizinho mais próximo a partir da origem.
export function otimizarSequencia(origem, pedidos) {
  const comCoord = pedidos.filter((p) => p.latitude != null && p.longitude != null);
  const semCoord = pedidos.filter((p) => p.latitude == null || p.longitude == null);
  if (!origem || origem.lat == null || comCoord.length === 0) return [...pedidos];

  const result = [];
  let atual = { lat: origem.lat, lng: origem.lng };
  const restantes = [...comCoord];
  while (restantes.length > 0) {
    let melhorIdx = 0;
    let melhorDist = Infinity;
    restantes.forEach((p, i) => {
      const d = haversineKm(atual, { lat: p.latitude, lng: p.longitude });
      if (d < melhorDist) { melhorDist = d; melhorIdx = i; }
    });
    const [escolhido] = restantes.splice(melhorIdx, 1);
    result.push(escolhido);
    atual = { lat: escolhido.latitude, lng: escolhido.longitude };
  }
  return [...result, ...semCoord]; // pedidos sem coordenada vão para o fim
}

function estimarDistanciaKm(origem, pedidos) {
  if (!origem || origem.lat == null) return 0;
  let total = 0;
  let atual = { lat: origem.lat, lng: origem.lng };
  for (const p of pedidos) {
    if (p.latitude == null) continue;
    total += haversineKm(atual, { lat: p.latitude, lng: p.longitude });
    atual = { lat: p.latitude, lng: p.longitude };
  }
  return Math.round(total * 10) / 10;
}

function estimarDuracaoMin(qtd, distKm, settings) {
  const porEntrega = settings?.avg_minutes_per_delivery || 12;
  const tempoTrajeto = Math.round((distKm / 25) * 60); // ~25km/h média urbana
  return qtd * porEntrega + tempoTrajeto;
}

function somarTotais(pedidos) {
  return pedidos.reduce(
    (acc, p) => {
      acc.total += Number(p.total || 0);
      if (p.classe_pagamento === "dinheiro") acc.dinheiro += Number(p.total || 0);
      else if (p.classe_pagamento === "online") acc.online += Number(p.total || 0);
      else acc.offline += Number(p.total || 0);
      return acc;
    },
    { total: 0, dinheiro: 0, online: 0, offline: 0 }
  );
}

// ------------- Geocodificação (Nominatim / OSM gratuito) -------------
export async function geocodificar(endereco) {
  if (!endereco) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
    const resp = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    return null;
  }
  return null;
}