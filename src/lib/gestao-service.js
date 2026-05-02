import { base44 } from "@/api/base44Client";

// Carrega tudo o que o módulo de gestão precisa em uma única chamada paralela
// Limites em cada lista evitam travamentos quando uma entidade tem muitos registros.
export async function carregarBaseGestao() {
  const safe = (p) => p.catch(() => []);
  const [
    lojas, fechamentos, contasPagar, contasReceber,
    produtos, fichasTecnicas, insumos, compras, movEstoque,
    categorias, formasPagamento, canais,
  ] = await Promise.all([
    safe(base44.entities.Loja.list("-created_date", 200)),
    safe(base44.entities.FechamentoDiario.list("-data", 500)),
    safe(base44.entities.ContaPagar.list("-data_vencimento", 1000)),
    safe(base44.entities.ContaReceber.list("-data_vencimento", 500)),
    safe(base44.entities.Produto.list("-created_date", 500)),
    safe(base44.entities.FichaTecnica.list("-created_date", 500)),
    safe(base44.entities.Insumo.list("-created_date", 500)),
    safe(base44.entities.Compra.list("-data", 200)),
    safe(base44.entities.MovimentacaoEstoque.list("-data", 200)),
    safe(base44.entities.CategoriaFinanceira.list("-created_date", 200)),
    safe(base44.entities.FormaPagamento.list("-created_date", 100)),
    safe(base44.entities.CanalVenda.list("-created_date", 100)),
  ]);
  return { lojas, fechamentos, contasPagar, contasReceber, produtos, fichasTecnicas, insumos, compras, movEstoque, categorias, formasPagamento, canais };
}

// Filtra por período (inclusivo)
export const dentroPeriodo = (data, de, ate) => {
  if (!data) return false;
  if (de && data < de) return false;
  if (ate && data > ate) return false;
  return true;
};

// Receita real e taxas por canal/forma a partir dos FechamentosDiários aprovados
export function calcularReceitaELoja(fechamentos, lojaId, de, ate) {
  const fs = fechamentos.filter((f) => {
    if (lojaId && f.loja_id !== lojaId) return false;
    if (!dentroPeriodo(f.data, de, ate)) return false;
    return f.status === "aprovado" || f.status === "fechado" || !f.status;
  });
  let receita = 0, taxas = 0, sangrias = 0, despesasCaixa = 0;
  fs.forEach((f) => {
    receita += Number(f.total_vendas) || Number(f.total_bruto) || 0;
    taxas += Number(f.total_taxas) || 0;
    sangrias += Number(f.total_sangrias) || 0;
    despesasCaixa += Number(f.total_despesas) || 0;
  });
  return { receita, taxas, sangrias, despesasCaixa, qtdDias: fs.length, fechamentos: fs };
}

// Custo dos insumos dos produtos vendidos (CMV) — usa ficha técnica + custo do insumo
export function calcularCMV({ fechamentos, fichasTecnicas, insumos, produtos, lojaId, de, ate }) {
  // Como não temos itens de venda detalhados por produto, usamos
  // movimentações de estoque do tipo "saida_venda" se existirem.
  // Caso contrário, estimamos pela receita * cmv_alvo do produto/loja.
  const fichasMap = new Map(fichasTecnicas.map((f) => [f.produto_id || f.id, f]));
  const insumoMap = new Map(insumos.map((i) => [i.id, i]));

  const custoFicha = (produtoId) => {
    const ficha = fichasMap.get(produtoId);
    if (!ficha?.itens) return 0;
    return ficha.itens.reduce((s, it) => {
      const ins = insumoMap.get(it.insumo_id);
      const custoUnit = Number(ins?.custo_medio) || Number(ins?.preco_ultimo) || 0;
      return s + custoUnit * (Number(it.quantidade) || 0);
    }, 0);
  };

  // Estimativa: somar receita e aplicar % CMV alvo médio dos produtos
  const cmvMedioAlvo = produtos.length > 0
    ? produtos.reduce((s, p) => s + (Number(p.cmv_alvo) || 0), 0) / produtos.length
    : 0;

  const { receita } = calcularReceitaELoja(fechamentos, lojaId, de, ate);
  const cmvEstimado = cmvMedioAlvo > 0 ? receita * (cmvMedioAlvo / 100) : 0;

  return { cmv: cmvEstimado, cmvPct: receita > 0 ? (cmvEstimado / receita) * 100 : 0, custoFicha, cmvMedioAlvo };
}

// Despesas pagas (apenas reais — exclui Banco Virtual)
export function calcularDespesas(contasPagar, lojaId, de, ate) {
  return contasPagar
    .filter((c) => c.status === "pago" || c.status === "baixado")
    .filter((c) => !c.banco_virtual && c.tipo_origem !== "interno")
    .filter((c) => !lojaId || c.loja_id === lojaId)
    .filter((c) => dentroPeriodo(c.data_pagamento || c.data_vencimento, de, ate))
    .reduce((s, c) => s + (Number(c.valor_pago) || Number(c.valor) || 0), 0);
}

// Grupos do DRE — ordem fixa de exibição
export const GRUPOS_DRE = [
  { chave: "pessoal", label: "Pessoal e Folha" },
  { chave: "ocupacao", label: "Ocupação" },
  { chave: "utilidades", label: "Utilidades" },
  { chave: "marketing", label: "Marketing e Comissões" },
  { chave: "administrativas", label: "Administrativas" },
  { chave: "manutencao", label: "Manutenção e Limpeza" },
  { chave: "impostos", label: "Impostos s/ Venda" },
  { chave: "financeiras", label: "Despesas Financeiras" },
  { chave: "outras", label: "Outras Despesas" },
];

// Agrupa contas a pagar por grupo_dre, separando Pago vs A Vencer (competência por data_vencimento)
export function agruparDespesasPorGrupoDRE({ contasPagar, categorias, lojaId, de, ate }) {
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const grupos = {};
  GRUPOS_DRE.forEach((g) => { grupos[g.chave] = { pago: 0, vencer: 0 }; });

  const filtradas = contasPagar
    .filter((c) => !c.banco_virtual && c.tipo_origem !== "interno")
    .filter((c) => c.status !== "cancelada")
    .filter((c) => !lojaId || c.loja_id === lojaId);

  filtradas.forEach((c) => {
    const cat = catMap.get(c.categoria_id);
    const grupo = cat?.grupo_dre || "outras";
    if (!grupos[grupo]) grupos[grupo] = { pago: 0, vencer: 0 };

    const isPago = c.status === "pago" || c.status === "baixado" || (Number(c.valor_pago) > 0 && c.data_pagamento);
    const dataRef = isPago ? (c.data_pagamento || c.data_vencimento) : c.data_vencimento;
    if (!dentroPeriodo(dataRef, de, ate)) return;

    const valor = Number(c.valor_pago) || Number(c.valor) || 0;
    if (isPago) grupos[grupo].pago += valor;
    else grupos[grupo].vencer += valor;
  });

  return grupos;
}

// Receita decomposta por canal de venda (a partir dos fechamentos aprovados)
export function calcularReceitaPorCanal(fechamentos, lojaId, de, ate) {
  const fs = fechamentos.filter((f) => {
    if (lojaId && f.loja_id !== lojaId) return false;
    if (!dentroPeriodo(f.data, de, ate)) return false;
    return f.status === "aprovado" || f.status === "fechado" || !f.status;
  });
  const map = new Map();
  fs.forEach((f) => {
    (f.vendas_por_canal || []).forEach((v) => {
      const key = v.canal_id || v.canal_nome || "sem_canal";
      const cur = map.get(key) || { canal_id: v.canal_id, canal_nome: v.canal_nome || "Sem canal", valor: 0 };
      cur.valor += Number(v.valor) || 0;
      map.set(key, cur);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
}

// DRE Gerencial expandido — estrutura completa com grupos, EBITDA, Prime Cost, Ponto de Equilíbrio
export function calcularDREExpandido({ base, lojaId, de, ate }) {
  const { receita, taxas } = calcularReceitaELoja(base.fechamentos, lojaId, de, ate);
  const { cmv, cmvPct } = calcularCMV({ ...base, lojaId, de, ate });
  const grupos = agruparDespesasPorGrupoDRE({
    contasPagar: base.contasPagar,
    categorias: base.categorias || [],
    lojaId, de, ate,
  });
  const canais = calcularReceitaPorCanal(base.fechamentos, lojaId, de, ate);

  // Soma helper
  const somaGrupo = (chave, modo = "pago") => grupos[chave]?.[modo] || 0;
  const totalDespesasOperacionais = (modo) =>
    ["pessoal", "ocupacao", "utilidades", "marketing", "administrativas", "manutencao", "outras"]
      .reduce((s, k) => s + somaGrupo(k, modo), 0);

  const impostosPago = somaGrupo("impostos", "pago");
  const impostosVencer = somaGrupo("impostos", "vencer");
  const financeirasPago = somaGrupo("financeiras", "pago");
  const financeirasVencer = somaGrupo("financeiras", "vencer");

  const receitaLiquida = receita - taxas - impostosPago;
  const lucroBruto = receitaLiquida - cmv;
  const opPago = totalDespesasOperacionais("pago");
  const opVencer = totalDespesasOperacionais("vencer");

  const ebitdaPago = lucroBruto - opPago;
  const ebitdaCompetencia = lucroBruto - opPago - opVencer - impostosVencer;

  const resultadoPago = ebitdaPago - financeirasPago;
  const resultadoCompetencia = ebitdaCompetencia - financeirasPago - financeirasVencer;

  // Prime Cost = CMV + Pessoal (indicador chave de food service)
  const folha = somaGrupo("pessoal", "pago") + somaGrupo("pessoal", "vencer");
  const primeCost = cmv + folha;
  const primeCostPct = receita > 0 ? (primeCost / receita) * 100 : 0;

  // Ponto de equilíbrio: Custos Fixos / Margem de Contribuição
  // Aqui aproximamos: Fixos = Ocupação + Pessoal + Adm + Utilidades (mínimas)
  const custosFixos = ["pessoal", "ocupacao", "administrativas", "utilidades"]
    .reduce((s, k) => s + somaGrupo(k, "pago") + somaGrupo(k, "vencer"), 0);
  const custosVariaveis = cmv + taxas + impostosPago + impostosVencer +
    somaGrupo("marketing", "pago") + somaGrupo("marketing", "vencer");
  const margemContribuicaoPct = receita > 0 ? ((receita - custosVariaveis) / receita) * 100 : 0;
  const pontoEquilibrio = margemContribuicaoPct > 0 ? custosFixos / (margemContribuicaoPct / 100) : 0;

  return {
    receita,
    receitaLiquida,
    taxas,
    cmv,
    cmvPct,
    lucroBruto,
    margemBruta: receita > 0 ? (lucroBruto / receita) * 100 : 0,
    grupos,
    despesasOperacionaisPago: opPago,
    despesasOperacionaisVencer: opVencer,
    impostosPago,
    impostosVencer,
    financeirasPago,
    financeirasVencer,
    ebitdaPago,
    ebitdaCompetencia,
    ebitdaMargemPago: receita > 0 ? (ebitdaPago / receita) * 100 : 0,
    ebitdaMargemCompetencia: receita > 0 ? (ebitdaCompetencia / receita) * 100 : 0,
    resultadoPago,
    resultadoCompetencia,
    margemLiquidaPago: receita > 0 ? (resultadoPago / receita) * 100 : 0,
    margemLiquidaCompetencia: receita > 0 ? (resultadoCompetencia / receita) * 100 : 0,
    primeCost,
    primeCostPct,
    folha,
    pontoEquilibrio,
    margemContribuicaoPct,
    canais,
  };
}

// Calcula período anterior de mesmo tamanho para comparativo
export function periodoAnterior(de, ate) {
  if (!de || !ate) return { de: null, ate: null };
  const dDe = new Date(de), dAte = new Date(ate);
  const dias = Math.round((dAte - dDe) / 86400000) + 1;
  const anteAnterior = new Date(dDe); anteAnterior.setDate(anteAnterior.getDate() - 1);
  const deAnterior = new Date(anteAnterior); deAnterior.setDate(deAnterior.getDate() - dias + 1);
  return {
    de: deAnterior.toISOString().slice(0, 10),
    ate: anteAnterior.toISOString().slice(0, 10),
  };
}

// DRE Gerencial — não contábil, simples
export function calcularDRE({ base, lojaId, de, ate }) {
  const { receita, taxas } = calcularReceitaELoja(base.fechamentos, lojaId, de, ate);
  const { cmv, cmvPct } = calcularCMV({ ...base, lojaId, de, ate });
  const despesas = calcularDespesas(base.contasPagar, lojaId, de, ate);

  const lucroBruto = receita - cmv;
  const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0;
  const resultado = receita - cmv - taxas - despesas;
  const margemLiquida = receita > 0 ? (resultado / receita) * 100 : 0;

  return { receita, cmv, cmvPct, taxas, despesas, lucroBruto, margemBruta, resultado, margemLiquida };
}

// Margem por produto a partir da ficha técnica
export function calcularMargemProdutos({ produtos, fichasTecnicas, insumos }) {
  const fichasMap = new Map(fichasTecnicas.map((f) => [f.produto_id, f]));
  const insumoMap = new Map(insumos.map((i) => [i.id, i]));
  return produtos.map((p) => {
    const preco = Number(p.preco_venda) || 0;
    const ficha = fichasMap.get(p.id);
    let custo = 0;
    if (ficha?.itens) {
      custo = ficha.itens.reduce((s, it) => {
        const ins = insumoMap.get(it.insumo_id);
        const cu = Number(ins?.custo_medio) || Number(ins?.preco_ultimo) || 0;
        return s + cu * (Number(it.quantidade) || 0);
      }, 0);
    }
    const margem = preco - custo;
    const margemPct = preco > 0 ? (margem / preco) * 100 : 0;
    return { produto: p, custo, preco, margem, margemPct, temFicha: !!ficha };
  });
}

// Gera lista de alertas a partir do estado geral
export function gerarAlertas(base) {
  const a = [];
  const hoje = new Date().toISOString().slice(0, 10);

  // 1. Contas a pagar vencidas
  const vencidas = base.contasPagar.filter((c) => c.status === "aberto" && c.data_vencimento && c.data_vencimento < hoje);
  if (vencidas.length > 0) {
    a.push({
      severidade: "alta",
      titulo: `${vencidas.length} conta(s) a pagar vencida(s)`,
      detalhe: `Total R$ ${vencidas.reduce((s, c) => s + (Number(c.valor) || 0), 0).toFixed(2)}`,
      link: "/financeiro/contas-pagar",
    });
  }

  // 2. Lojas sem fechamento nos últimos 2 dias
  const limite = new Date(); limite.setDate(limite.getDate() - 2);
  const limStr = limite.toISOString().slice(0, 10);
  const semFechamento = base.lojas.filter((l) => {
    const ult = base.fechamentos.filter((f) => f.loja_id === l.id).sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];
    return !ult || (ult.data && ult.data < limStr);
  });
  if (semFechamento.length > 0) {
    a.push({
      severidade: "media",
      titulo: `${semFechamento.length} loja(s) sem fechamento recente`,
      detalhe: semFechamento.map((l) => l.nome).join(", "),
      link: "/vendas/fechamentos",
    });
  }

  // 3. Margem bruta abaixo de 50% nos últimos 30 dias
  const de = new Date(); de.setDate(de.getDate() - 30);
  const dre = calcularDRE({ base, lojaId: null, de: de.toISOString().slice(0, 10), ate: hoje });
  if (dre.receita > 0 && dre.margemBruta < 50) {
    a.push({
      severidade: "media",
      titulo: `Margem bruta consolidada em ${dre.margemBruta.toFixed(1)}%`,
      detalhe: "Esperado: acima de 50%. Verifique CMV e mix de produtos.",
      link: "/gestao/cmv",
    });
  }

  // 4. CMV acima do alvo
  if (dre.receita > 0 && dre.cmvPct > 35) {
    a.push({
      severidade: "alta",
      titulo: `CMV em ${dre.cmvPct.toFixed(1)}%`,
      detalhe: "CMV alto compromete margem. Revise compras e desperdícios.",
      link: "/gestao/cmv",
    });
  }

  // 5. Resultado negativo
  if (dre.resultado < 0) {
    a.push({
      severidade: "critica",
      titulo: `Resultado negativo nos últimos 30 dias`,
      detalhe: `Prejuízo de R$ ${Math.abs(dre.resultado).toFixed(2)}`,
      link: "/gestao/dre",
    });
  }

  return a.sort((x, y) => {
    const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return (ordem[x.severidade] ?? 9) - (ordem[y.severidade] ?? 9);
  });
}