import { base44 } from "@/api/base44Client";

// =====================================================================
// Serviço do módulo Mesas / Comandas (PWA Garçom).
// Reaproveita a entidade Produto existente; bordas/sabores vêm de
// mesa_modificador. Gerencia mesas, comandas, itens, totais e o envio
// dos itens para produção (cozinha/pizzaria/bar).
// =====================================================================

export const MESA_STATUS = [
  { value: "livre", label: "Livre", cor: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { value: "aberta", label: "Aberta", cor: "bg-blue-500 hover:bg-blue-600 text-white" },
  { value: "ocupada", label: "Ocupada", cor: "bg-orange-500 hover:bg-orange-600 text-white" },
  { value: "pedido_enviado", label: "Pedido enviado", cor: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "em_producao", label: "Em produção", cor: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "pronto", label: "Pronto", cor: "bg-cyan-500 hover:bg-cyan-600 text-white" },
  { value: "conta_solicitada", label: "Conta solicitada", cor: "bg-violet-500 hover:bg-violet-600 text-white" },
  { value: "fechada", label: "Fechada", cor: "bg-slate-400 hover:bg-slate-500 text-white" },
  { value: "cancelada", label: "Cancelada", cor: "bg-red-500 hover:bg-red-600 text-white" },
];

export const getMesaStatus = (v) => MESA_STATUS.find((s) => s.value === v) || MESA_STATUS[0];

export const fmtMoeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Gera um UID local (evita item duplicado em reenvio offline).
export function gerarLocalUid() {
  return `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Detecta se um Produto é pizza pela categoria/nome.
export function ehPizza(produto) {
  const cat = (produto?.categoria || "").toLowerCase();
  const nome = (produto?.nome || "").toLowerCase();
  return cat.includes("pizza") || nome.includes("pizza");
}

// Detecta o tamanho da pizza pelo nome do produto.
export function tamanhoPizza(produto) {
  const nome = (produto?.nome || "").toLowerCase();
  if (nome.includes("pequena")) return "pequena";
  if (nome.includes("média") || nome.includes("media")) return "media";
  if (nome.includes("grande")) return "grande";
  return "media";
}

// Roteia o produto para o setor de preparo correto.
export function setorDoProduto(produto) {
  const cat = (produto?.categoria || "").toLowerCase();
  if (cat.includes("pizza")) return "pizzaria";
  if (cat.includes("cerveja") || cat.includes("bebida")) return "bar";
  if (cat.includes("prato") || cat.includes("combo")) return "cozinha";
  return "cozinha";
}

const lojaQuery = (lojaId) => (lojaId && lojaId !== "todas" ? { loja_id: lojaId } : {});

export const mesasService = {
  // ------------- Garçons -------------
  // Colaboradores que atuam como garçom (cargo/observação contendo "garçom")
  // ou — fallback — todos os ativos, para o MVP não ficar vazio.
  listGarcons: async (lojaId) => {
    const q = { status: "ativo", ...lojaQuery(lojaId) };
    const colabs = await base44.entities.Colaborador.filter(q, "nome", 200);
    return colabs;
  },

  // ------------- Config -------------
  getConfig: async (lojaId) => {
    const list = await base44.entities.mesa_config.filter(lojaQuery(lojaId), "-created_date", 1);
    return list[0] || { taxa_servico_percentual: 10, sabores_pizza_pequena: 1, sabores_pizza_media: 2, sabores_pizza_grande: 3, borda_obrigatoria: true };
  },

  // ------------- Mesas -------------
  listMesas: async (lojaId) => {
    const q = { ativa: true, ...lojaQuery(lojaId) };
    return base44.entities.mesa.filter(q, "numero", 200);
  },

  getMesa: async (mesaId) => base44.entities.mesa.get(mesaId),

  // Abre uma mesa: cria a comanda e marca a mesa como aberta.
  abrirMesa: async ({ mesa, garcom, lojaId, config }) => {
    const comanda = await base44.entities.comanda.create({
      codigo: "AUTO",
      mesa_id: mesa.id,
      mesa_numero: mesa.numero,
      loja_id: lojaId || mesa.loja_id || "",
      garcom_id: garcom?.id || "",
      garcom_nome: garcom?.nome || "",
      quantidade_pessoas: 1,
      status: "aberta",
      taxa_servico_percentual: config?.taxa_servico_percentual ?? 10,
      aberta_em: new Date().toISOString(),
    });
    await base44.entities.mesa.update(mesa.id, { status: "aberta", comanda_atual_id: comanda.id });
    return comanda;
  },

  // ------------- Comandas -------------
  getComanda: async (comandaId) => base44.entities.comanda.get(comandaId),

  getComandaPorMesa: async (mesaId) => {
    const list = await base44.entities.comanda.filter(
      { mesa_id: mesaId, status: { $in: ["aberta", "pedido_enviado", "em_producao", "pronto", "conta_solicitada"] } },
      "-aberta_em", 1
    );
    return list[0] || null;
  },

  getItens: async (comandaId) =>
    base44.entities.comanda_item.filter({ comanda_id: comandaId, status: { $ne: "cancelado" } }, "created_date", 300),

  // ------------- Produtos / Modificadores -------------
  listProdutos: async (lojaId) => {
    const produtos = await base44.entities.Produto.filter({ ativo: true }, "nome", 500);
    // Produtos compartilhados ou da loja selecionada
    if (!lojaId || lojaId === "todas") return produtos;
    return produtos.filter((p) => p.compartilhado_entre_lojas !== false || (p.loja_ids || []).includes(lojaId) || (p.loja_ids || []).length === 0);
  },

  // Categorias derivadas dos produtos ativos.
  listCategorias: async (lojaId) => {
    const produtos = await mesasService.listProdutos(lojaId);
    const cats = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))];
    return cats.sort();
  },

  listModificadores: async (tipo, lojaId) => {
    const q = { tipo, ativo: true };
    const list = await base44.entities.mesa_modificador.filter(q, "ordem", 200);
    if (!lojaId || lojaId === "todas") return list;
    return list.filter((m) => !m.loja_id || m.loja_id === lojaId);
  },

  // ------------- Itens -------------
  // Adiciona um item à comanda (status rascunho por padrão).
  adicionarItem: async ({ comanda, produto, quantidade, opcoes, observacao, tamanho }) => {
    const precoUnit = Number(produto.preco_venda || 0);
    const precoAdd = (opcoes || []).reduce((s, o) => s + Number(o.preco_adicional || 0), 0);
    const total = (precoUnit + precoAdd) * Number(quantidade || 1);
    const item = await base44.entities.comanda_item.create({
      comanda_id: comanda.id,
      loja_id: comanda.loja_id || "",
      produto_id: produto.id,
      nome_produto: produto.nome,
      categoria: produto.categoria || "",
      eh_pizza: ehPizza(produto),
      tamanho: tamanho || "",
      quantidade: Number(quantidade || 1),
      preco_unitario: precoUnit,
      preco_adicionais: precoAdd,
      total,
      observacao: observacao || "",
      opcoes: opcoes || [],
      setor_preparo: setorDoProduto(produto),
      status: "rascunho",
      garcom_id: comanda.garcom_id || "",
      garcom_nome: comanda.garcom_nome || "",
      local_uid: gerarLocalUid(),
    });
    await mesasService.recalcularTotais(comanda.id);
    return item;
  },

  atualizarQuantidade: async (item, novaQtd) => {
    const qtd = Math.max(1, Number(novaQtd || 1));
    const total = (Number(item.preco_unitario || 0) + Number(item.preco_adicionais || 0)) * qtd;
    await base44.entities.comanda_item.update(item.id, { quantidade: qtd, total });
    await mesasService.recalcularTotais(item.comanda_id);
  },

  // Remove item ainda em rascunho.
  removerItem: async (item) => {
    await base44.entities.comanda_item.delete(item.id);
    await mesasService.recalcularTotais(item.comanda_id);
  },

  // Cancela item já enviado (não apaga — registra motivo).
  cancelarItem: async (item, motivo) => {
    await base44.entities.comanda_item.update(item.id, {
      status: "cancelado",
      cancelado_em: new Date().toISOString(),
      motivo_cancelamento: motivo || "",
    });
    await mesasService.recalcularTotais(item.comanda_id);
  },

  // ------------- Totais -------------
  recalcularTotais: async (comandaId) => {
    const comanda = await base44.entities.comanda.get(comandaId);
    const itens = await mesasService.getItens(comandaId);
    const subtotal = itens.reduce((s, i) => s + Number(i.total || 0), 0);
    const pct = Number(comanda.taxa_servico_percentual ?? 10);
    const taxa = subtotal * (pct / 100);
    const desconto = Number(comanda.desconto || 0);
    const total = subtotal + taxa - desconto;
    await base44.entities.comanda.update(comandaId, {
      subtotal,
      taxa_servico: Math.round(taxa * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
    return { subtotal, taxa, total };
  },

  // ------------- Salvar / Enviar -------------
  // Salva: mantém comanda aberta e marca a mesa como ocupada.
  salvarComanda: async (comanda) => {
    await mesasService.recalcularTotais(comanda.id);
    await base44.entities.mesa.update(comanda.mesa_id, { status: "ocupada", comanda_atual_id: comanda.id });
  },

  // Envia itens em rascunho para a produção, agrupados por setor.
  enviarParaProducao: async (comanda) => {
    const itens = await base44.entities.comanda_item.filter(
      { comanda_id: comanda.id, status: "rascunho" }, "created_date", 300
    );
    if (itens.length === 0) return { enviados: 0 };

    // Agrupa por setor de preparo
    const porSetor = {};
    for (const it of itens) {
      const setor = it.setor_preparo && it.setor_preparo !== "nenhum" ? it.setor_preparo : "cozinha";
      (porSetor[setor] = porSetor[setor] || []).push(it);
    }

    const agora = new Date().toISOString();
    for (const [setor, lista] of Object.entries(porSetor)) {
      await base44.entities.producao_pedido.create({
        comanda_id: comanda.id,
        loja_id: comanda.loja_id || "",
        mesa_numero: comanda.mesa_numero,
        setor,
        garcom_nome: comanda.garcom_nome || "",
        itens: lista.map((it) => ({
          comanda_item_id: it.id,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          detalhes: formatarDetalhes(it),
        })),
        status: "enviado",
        enviado_em: agora,
      });
      // Marca itens como enviados
      for (const it of lista) {
        await base44.entities.comanda_item.update(it.id, { status: "enviado", enviado_em: agora });
      }
    }

    await base44.entities.comanda.update(comanda.id, { status: "pedido_enviado" });
    await base44.entities.mesa.update(comanda.mesa_id, { status: "pedido_enviado", comanda_atual_id: comanda.id });
    return { enviados: itens.length };
  },

  solicitarFechamento: async (comanda) => {
    await base44.entities.comanda.update(comanda.id, { status: "conta_solicitada" });
    await base44.entities.mesa.update(comanda.mesa_id, { status: "conta_solicitada" });
  },
};

// Formata borda/sabores/observação de um item para a ficha de produção.
export function formatarDetalhes(item) {
  const partes = [];
  (item.opcoes || []).forEach((o) => partes.push(`${o.grupo_nome}: ${o.opcao_nome}`));
  if (item.observacao) partes.push(`Obs: ${item.observacao}`);
  return partes.join(" · ");
}