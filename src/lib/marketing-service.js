import { base44 } from "@/api/base44Client";

// Recalcula totais de um cliente a partir dos PedidoCliente
export async function recalcularCliente(clienteId) {
  const pedidos = await base44.entities.PedidoCliente.filter({ cliente_id: clienteId });
  const total_pedidos = pedidos.length;
  const total_gasto = pedidos.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
  const ticket_medio = total_pedidos > 0 ? total_gasto / total_pedidos : 0;
  const datas = pedidos.map((p) => p.data).filter(Boolean).sort();
  const primeira_compra = datas[0];
  const ultima_compra = datas[datas.length - 1];

  // Status automático
  let status = "ativo";
  const hoje = new Date();
  if (ultima_compra) {
    const diasSemComprar = Math.floor((hoje - new Date(ultima_compra)) / (1000 * 60 * 60 * 24));
    if (diasSemComprar > 60) status = "inativo";
    else if (total_pedidos >= 10) status = "vip";
    else if (total_pedidos >= 3) status = "recorrente";
  }

  await base44.entities.Cliente.update(clienteId, {
    total_pedidos, total_gasto, ticket_medio,
    primeira_compra, ultima_compra, status,
  });
}

// Validação básica de cupom no momento de uso
export function validarCupom(cupom, { valor, canal_id, loja_id, hoje = new Date() }) {
  if (!cupom?.ativo) return { ok: false, motivo: "Cupom inativo" };
  if (cupom.data_inicio && new Date(cupom.data_inicio) > hoje) return { ok: false, motivo: "Cupom ainda não iniciou" };
  if (cupom.data_fim && new Date(cupom.data_fim) < hoje) return { ok: false, motivo: "Cupom expirado" };
  if (cupom.valor_minimo_pedido && valor < cupom.valor_minimo_pedido) return { ok: false, motivo: `Valor mínimo: R$ ${cupom.valor_minimo_pedido}` };
  if (cupom.canal_ids?.length && canal_id && !cupom.canal_ids.includes(canal_id)) return { ok: false, motivo: "Canal não elegível" };
  if (cupom.loja_ids?.length && loja_id && !cupom.loja_ids.includes(loja_id)) return { ok: false, motivo: "Loja não elegível" };
  if (cupom.limite_total_usos && (cupom.usos_atuais || 0) >= cupom.limite_total_usos) return { ok: false, motivo: "Limite de usos atingido" };
  return { ok: true };
}

// Performance por canal: retorna array de { canal_id, nome, pedidos, receita, ticket_medio }
export function agruparPorCanal(pedidos, canais) {
  const map = new Map();
  pedidos.forEach((p) => {
    const key = p.canal_id || "sem_canal";
    if (!map.has(key)) map.set(key, { canal_id: key, pedidos: 0, receita: 0 });
    const r = map.get(key);
    r.pedidos += 1;
    r.receita += Number(p.valor_total) || 0;
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    nome: canais.find((c) => c.id === r.canal_id)?.nome || "Sem canal",
    ticket_medio: r.pedidos > 0 ? r.receita / r.pedidos : 0,
  })).sort((a, b) => b.receita - a.receita);
}

// Sincroniza clientes do Cardápio Web (external_customers) para o CRM (Cliente).
// Upsert por telefone: atualiza quem já existe, cria quem falta — sem duplicar.
// Retorna { criados, atualizados, ignorados }.
export async function sincronizarClientesCardapioWeb() {
  const externos = await base44.entities.external_customers.list("-last_order_at", 1000);
  const clientes = await base44.entities.Cliente.list("", 5000);

  // Index do CRM por telefone normalizado (só dígitos)
  const soDigitos = (t) => (t || "").replace(/\D/g, "");
  const porTelefone = new Map();
  clientes.forEach((c) => {
    const k = soDigitos(c.telefone);
    if (k) porTelefone.set(k, c);
  });

  let criados = 0, atualizados = 0, ignorados = 0;

  for (const ext of externos) {
    const tel = soDigitos(ext.phone);
    if (!tel && !ext.name) { ignorados++; continue; }

    const total_pedidos = Number(ext.total_orders) || 0;
    const total_gasto = Number(ext.total_spent) || 0;
    const ticket_medio = total_pedidos > 0 ? total_gasto / total_pedidos : 0;
    const ultima_compra = ext.last_order_at ? ext.last_order_at.slice(0, 10) : undefined;

    const dados = {
      nome: ext.name || "Cliente Cardápio Web",
      telefone: ext.phone || undefined,
      documento: ext.document || undefined,
      endereco: ext.address || undefined,
      total_pedidos,
      total_gasto,
      ticket_medio,
      ultima_compra,
      observacoes: ext.neighborhood ? `Bairro: ${ext.neighborhood}` : undefined,
    };

    const existente = tel ? porTelefone.get(tel) : null;
    if (existente) {
      await base44.entities.Cliente.update(existente.id, dados);
      atualizados++;
    } else {
      const novo = await base44.entities.Cliente.create({
        ...dados,
        canal_origem_id: "cardapio_web",
        status: "ativo",
      });
      if (tel) porTelefone.set(tel, novo);
      criados++;
    }
  }

  return { criados, atualizados, ignorados };
}

// Marca clientes sem compra há X dias
export function filtrarInativos(clientes, dias = 60) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  return clientes.filter((c) => {
    if (!c.ultima_compra) return false;
    return new Date(c.ultima_compra) < limite;
  });
}