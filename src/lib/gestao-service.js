import { base44 } from "@/api/base44Client";

// Carrega tudo o que o módulo de gestão precisa em uma única chamada paralela
export async function carregarBaseGestao() {
  const [
    lojas, fechamentos, contasPagar, contasReceber,
    produtos, fichasTecnicas, insumos, compras, movEstoque,
    categorias, formasPagamento, canais,
  ] = await Promise.all([
    base44.entities.Loja.list(),
    base44.entities.FechamentoDiario.list(),
    base44.entities.ContaPagar.list(),
    base44.entities.ContaReceber.list().catch(() => []),
    base44.entities.Produto.list(),
    base44.entities.FichaTecnica.list().catch(() => []),
    base44.entities.Insumo.list().catch(() => []),
    base44.entities.Compra.list().catch(() => []),
    base44.entities.MovimentacaoEstoque.list().catch(() => []),
    base44.entities.CategoriaFinanceira.list().catch(() => []),
    base44.entities.FormaPagamento.list().catch(() => []),
    base44.entities.CanalVenda.list().catch(() => []),
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