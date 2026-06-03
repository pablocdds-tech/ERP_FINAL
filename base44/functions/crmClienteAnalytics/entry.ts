import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// CRM Analytics — cruza clientes x pedidos x itens (sabores) x dias da semana.
// Fontes: external_orders + external_order_items (Cardápio Web) e pdv_pedido (todos os canais).
// Ações:
//   - "perfis": lista agregada de clientes com LTV, frequência, dias preferidos, sabores favoritos.
//   - "perfil": detalhe de 1 cliente (por telefone).
//   - "busca_sabor": clientes que pedem determinado termo (sabor/produto), com filtro opcional de dia da semana.

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function normKey(s) { return String(s || '').trim().toLowerCase(); }
function normPhone(p) { return String(p || '').replace(/\D/g, ''); }

// Quebra notes/options em "tokens" de sabores/complementos pesquisáveis.
function tokensDoItem(item) {
  const tokens = [];
  if (item.product_name) tokens.push(item.product_name);
  // notes vem como "Escolha seu sabor: CALABRESA, OVOMALTINE | Obs: ..."
  const notes = String(item.notes || '');
  for (const parte of notes.split('|')) {
    const aposDoisPontos = parte.includes(':') ? parte.split(':').slice(1).join(':') : parte;
    for (const s of aposDoisPontos.split(',')) {
      const t = s.trim();
      if (t && !/^obs/i.test(parte)) tokens.push(t);
    }
  }
  return tokens.filter(Boolean);
}

function diaSemana(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.getDay(); // 0=Dom
}

async function carregarPedidosUnificados(sr) {
  // external_orders + seus itens (sabores reais)
  const [orders, items, pdv] = await Promise.all([
    sr.entities.external_orders.list('-ordered_at', 2000).catch(() => []),
    sr.entities.external_order_items.list('-created_date', 8000).catch(() => []),
    sr.entities.pdv_pedido.list('-recebido_em', 2000).catch(() => []),
  ]);

  const itemsByOrder = {};
  for (const it of items) {
    (itemsByOrder[it.external_order_id] = itemsByOrder[it.external_order_id] || []).push(it);
  }

  // Normaliza tudo num formato comum: { phone, name, total, when, canal, itens:[{nome, tokens, qtd}] }
  const pedidos = [];

  for (const o of orders) {
    const its = itemsByOrder[o.id] || [];
    pedidos.push({
      phone: normPhone(o.customer_phone),
      name: o.customer_name || '',
      total: num(o.total_amount),
      when: o.ordered_at || o.created_date,
      canal: o.sales_channel || 'cardapio_web',
      neighborhood: o.neighborhood || '',
      itens: its.map((it) => ({ nome: it.product_name, tokens: tokensDoItem(it), qtd: num(it.quantity) || 1 })),
    });
  }

  // Pedidos do PDV que NÃO vieram do Cardápio Web (evita duplicar — CW já está acima).
  for (const p of pdv) {
    if (p.canal === 'cardapio_web') continue;
    pedidos.push({
      phone: normPhone(p.cliente_telefone),
      name: p.cliente_nome || '',
      total: num(p.total),
      when: p.recebido_em || p.created_date,
      canal: p.canal || 'balcao',
      neighborhood: p.bairro || '',
      itens: (p.itens || []).map((it) => ({
        nome: it.produto_nome,
        tokens: tokensDoItem({ product_name: it.produto_nome, notes: it.observacao }),
        qtd: num(it.quantidade) || 1,
      })),
    });
  }

  return pedidos.filter((p) => p.phone);
}

function agruparPorCliente(pedidos) {
  const mapa = {};
  for (const p of pedidos) {
    const key = p.phone;
    if (!mapa[key]) {
      mapa[key] = {
        phone: p.phone, name: p.name, neighborhood: p.neighborhood,
        pedidos: 0, total_gasto: 0, primeiro: p.when, ultimo: p.when,
        dias: [0, 0, 0, 0, 0, 0, 0], sabores: {}, canais: {},
      };
    }
    const c = mapa[key];
    c.pedidos += 1;
    c.total_gasto += p.total;
    if (p.name && !c.name) c.name = p.name;
    if (p.neighborhood && !c.neighborhood) c.neighborhood = p.neighborhood;
    if (new Date(p.when) < new Date(c.primeiro)) c.primeiro = p.when;
    if (new Date(p.when) > new Date(c.ultimo)) c.ultimo = p.when;
    const dw = diaSemana(p.when);
    if (dw !== null) c.dias[dw] += 1;
    c.canais[p.canal] = (c.canais[p.canal] || 0) + 1;
    for (const it of p.itens) {
      for (const tk of it.tokens) {
        const k = tk.trim();
        if (!k) continue;
        if (!c.sabores[k]) c.sabores[k] = 0;
        c.sabores[k] += it.qtd;
      }
    }
  }
  return mapa;
}

function resumirCliente(c) {
  const saboresOrdenados = Object.entries(c.sabores).sort((a, b) => b[1] - a[1]);
  const diaTop = c.dias.indexOf(Math.max(...c.dias));
  // Frequência média em dias entre o primeiro e o último pedido
  const dPrimeiro = new Date(c.primeiro), dUltimo = new Date(c.ultimo);
  const spanDias = Math.max(1, Math.round((dUltimo - dPrimeiro) / 86400000));
  const freqMediaDias = c.pedidos > 1 ? Math.round(spanDias / (c.pedidos - 1)) : null;
  const diasSemPedir = Math.round((Date.now() - dUltimo.getTime()) / 86400000);
  return {
    phone: c.phone,
    name: c.name || 'Sem nome',
    neighborhood: c.neighborhood,
    pedidos: c.pedidos,
    total_gasto: Math.round(c.total_gasto * 100) / 100,
    ticket_medio: c.pedidos ? Math.round((c.total_gasto / c.pedidos) * 100) / 100 : 0,
    primeiro_pedido: c.primeiro,
    ultimo_pedido: c.ultimo,
    dias_sem_pedir: diasSemPedir,
    freq_media_dias: freqMediaDias,
    dia_preferido: diaTop >= 0 && c.dias[diaTop] > 0 ? DIAS[diaTop] : null,
    dia_preferido_idx: diaTop >= 0 && c.dias[diaTop] > 0 ? diaTop : null,
    distribuicao_dias: c.dias.map((qtd, i) => ({ dia: DIAS[i], idx: i, qtd })),
    sabores_favoritos: saboresOrdenados.slice(0, 8).map(([nome, qtd]) => ({ nome, qtd })),
    canais: Object.entries(c.canais).map(([canal, qtd]) => ({ canal, qtd })),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'perfis';

    const pedidos = await carregarPedidosUnificados(sr);
    const mapa = agruparPorCliente(pedidos);
    const clientes = Object.values(mapa).map(resumirCliente);

    if (action === 'perfis') {
      clientes.sort((a, b) => b.total_gasto - a.total_gasto);
      return Response.json({ clientes, total_clientes: clientes.length });
    }

    if (action === 'perfil') {
      const phone = normPhone(body.phone);
      const cliente = clientes.find((c) => c.phone === phone) || null;
      // Histórico de pedidos do cliente (cronológico)
      const historico = pedidos
        .filter((p) => p.phone === phone)
        .sort((a, b) => new Date(b.when) - new Date(a.when))
        .map((p) => ({
          when: p.when, total: p.total, canal: p.canal,
          dia: diaSemana(p.when) !== null ? DIAS[diaSemana(p.when)] : '',
          itens: p.itens.map((it) => ({ nome: it.nome, qtd: it.qtd, tokens: it.tokens })),
        }));
      return Response.json({ cliente, historico });
    }

    if (action === 'busca_sabor') {
      const termo = normKey(body.termo);
      const diaFiltro = body.dia_idx != null && body.dia_idx !== '' ? Number(body.dia_idx) : null;
      if (!termo) return Response.json({ resultados: [] });

      // Para cada cliente, conta quantas vezes pediu o termo (e em qual dia)
      const resultados = [];
      for (const c of Object.values(mapa)) {
        // Reconta a partir dos pedidos crus para conseguir filtrar por dia
        const pedidosCliente = pedidos.filter((p) => p.phone === c.phone);
        let vezes = 0;
        const diasComTermo = [0, 0, 0, 0, 0, 0, 0];
        let ultimaVez = null;
        for (const p of pedidosCliente) {
          const dw = diaSemana(p.when);
          const matched = p.itens.some((it) => it.tokens.some((tk) => normKey(tk).includes(termo)));
          if (matched) {
            if (diaFiltro === null || dw === diaFiltro) {
              vezes += 1;
              if (dw !== null) diasComTermo[dw] += 1;
              if (!ultimaVez || new Date(p.when) > new Date(ultimaVez)) ultimaVez = p.when;
            }
          }
        }
        if (vezes > 0) {
          const resumo = resumirCliente(c);
          resultados.push({
            phone: c.phone, name: resumo.name, neighborhood: resumo.neighborhood,
            vezes_pediu_termo: vezes, ultima_vez_termo: ultimaVez,
            dias_termo: diasComTermo.map((qtd, i) => ({ dia: DIAS[i], idx: i, qtd })),
            total_pedidos: resumo.pedidos, total_gasto: resumo.total_gasto,
            ticket_medio: resumo.ticket_medio, dia_preferido: resumo.dia_preferido,
          });
        }
      }
      resultados.sort((a, b) => b.vezes_pediu_termo - a.vezes_pediu_termo);
      return Response.json({ resultados, termo: body.termo, dia_idx: diaFiltro });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});