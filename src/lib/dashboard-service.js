import { base44 } from "@/api/base44Client";
import { calcularSaldosBancarios, calcularSaldosVirtuais } from "@/lib/financeiro-service";

const safe = (p) => p.catch(() => []);
const num = (v) => Number(v) || 0;

/**
 * Períodos pré-definidos. Retorna { de, ate } em ISO yyyy-mm-dd.
 */
export function resolverPeriodo(chave, custom) {
  const hoje = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const sub = (n) => { const d = new Date(hoje); d.setDate(d.getDate() - n); return d; };
  switch (chave) {
    case "hoje": return { de: iso(hoje), ate: iso(hoje) };
    case "ontem": { const d = sub(1); return { de: iso(d), ate: iso(d) }; }
    case "7dias": return { de: iso(sub(6)), ate: iso(hoje) };
    case "mes_atual": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { de: iso(ini), ate: iso(hoje) };
    }
    case "mes_anterior": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { de: iso(ini), ate: iso(fim) };
    }
    case "personalizado":
      return { de: custom?.de || iso(hoje), ate: custom?.ate || iso(hoje) };
    default: return { de: iso(hoje), ate: iso(hoje) };
  }
}

export function periodoAnterior(de, ate) {
  if (!de || !ate) return { de: null, ate: null };
  const dDe = new Date(de), dAte = new Date(ate);
  const dias = Math.round((dAte - dDe) / 86400000) + 1;
  const fimAnt = new Date(dDe); fimAnt.setDate(fimAnt.getDate() - 1);
  const iniAnt = new Date(fimAnt); iniAnt.setDate(iniAnt.getDate() - dias + 1);
  return { de: iniAnt.toISOString().slice(0, 10), ate: fimAnt.toISOString().slice(0, 10) };
}

export const dentro = (data, de, ate) => !!data && (!de || data >= de) && (!ate || data <= ate);

/**
 * Carrega tudo o que o Dashboard precisa em paralelo. Lista enxuta para velocidade.
 */
export async function carregarDashboard() {
  const [
    lojas, fechamentos, contasPagar, contasReceber,
    contasBancarias, movBancarias, lancInternos,
    movSocio, produtos, insumos, compras, notasFiscais,
    ordensProducao, movEstoque, ajustesPerdas, inventarios,
    chamados, tarefas, checklistsExec, manutencoes,
    colaboradores, registrosPonto, escalas, solicitacoesRH,
    campanhas, cupons, clientes, avaliacoes, reclamacoes, reembolsos, cortesias,
    ocorrenciasOp, categorias, fichasTecnicas,
  ] = await Promise.all([
    safe(base44.entities.Loja.list("-created_date", 200)),
    safe(base44.entities.FechamentoDiario.list("-data", 365)),
    safe(base44.entities.ContaPagar.list("-data_vencimento", 1000)),
    safe(base44.entities.ContaReceber.list("-data_vencimento", 1000)),
    safe(base44.entities.ContaBancaria.list("-created_date", 200)),
    safe(base44.entities.MovimentacaoBancaria.list("-data", 3000)),
    safe(base44.entities.LancamentoInterno.list("-created_date", 1000)),
    safe(base44.entities.MovimentoSocio.list("-data", 1000)),
    safe(base44.entities.Produto.list("-created_date", 500)),
    safe(base44.entities.Insumo.list("-created_date", 500)),
    safe(base44.entities.Compra.list("-data", 200)),
    safe(base44.entities.NotaFiscal.list("-created_date", 200)),
    safe(base44.entities.OrdemProducao.list("-created_date", 200)),
    safe(base44.entities.MovimentacaoEstoque.list("-data", 1000)),
    safe(base44.entities.AjustePerda.list("-data", 200)),
    safe(base44.entities.Inventario.list("-created_date", 100)),
    safe(base44.entities.Chamado.list("-created_date", 300)),
    safe(base44.entities.Tarefa.list("-created_date", 300)),
    safe(base44.entities.ChecklistExecucao.list("-created_date", 300)),
    safe(base44.entities.ManutencaoPlano.list("-created_date", 200)),
    safe(base44.entities.Colaborador.list("-created_date", 500)),
    safe(base44.entities.RegistroPonto.list("-horario", 1000)),
    safe(base44.entities.Escala.list("-created_date", 500)),
    safe(base44.entities.SolicitacaoRH.list("-created_date", 200)),
    safe(base44.entities.Campanha.list("-created_date", 100)),
    safe(base44.entities.Cupom.list("-created_date", 200)),
    safe(base44.entities.Cliente.list("-created_date", 500)),
    safe(base44.entities.Avaliacao.list("-data", 300)),
    safe(base44.entities.Reclamacao.list("-data", 300)),
    safe(base44.entities.Reembolso.list("-data", 200)),
    safe(base44.entities.Cortesia.list("-data", 200)),
    safe(base44.entities.OcorrenciaOperacional.list("-created_date", 300)),
    safe(base44.entities.CategoriaFinanceira.list("-created_date", 300)),
    safe(base44.entities.FichaTecnica.list("-created_date", 500)),
  ]);
  return {
    lojas, fechamentos, contasPagar, contasReceber,
    contasBancarias, movBancarias, lancInternos,
    movSocio, produtos, insumos, compras, notasFiscais,
    ordensProducao, movEstoque, ajustesPerdas, inventarios,
    chamados, tarefas, checklistsExec, manutencoes,
    colaboradores, registrosPonto, escalas, solicitacoesRH,
    campanhas, cupons, clientes, avaliacoes, reclamacoes, reembolsos, cortesias,
    ocorrenciasOp, categorias, fichasTecnicas,
  };
}

/* =========================================
 * VENDAS — só fechamentos aprovados/fechados
 * ========================================= */
export function calcularVendas(base, lojaId, de, ate) {
  const fs = base.fechamentos.filter((f) => {
    if (lojaId && f.loja_id !== lojaId) return false;
    if (!dentro(f.data, de, ate)) return false;
    const st = f.status || "fechado";
    return st === "aprovado" || st === "fechado";
  });
  let total = 0, ticketSoma = 0, ticketQtd = 0;
  const porFP = new Map();
  const porCanal = new Map();
  const porLoja = new Map();
  const porDia = new Map();
  fs.forEach((f) => {
    const v = num(f.total_vendas) || num(f.total_bruto);
    total += v;
    if (num(f.qtd_clientes) > 0) { ticketSoma += v; ticketQtd += num(f.qtd_clientes); }
    (f.vendas_por_pagamento || []).forEach((x) => {
      const k = x.forma_nome || x.forma_pagamento_id || "—";
      porFP.set(k, (porFP.get(k) || 0) + num(x.valor));
    });
    (f.vendas_por_canal || []).forEach((x) => {
      const k = x.canal_nome || x.canal_id || "—";
      porCanal.set(k, (porCanal.get(k) || 0) + num(x.valor));
    });
    porLoja.set(f.loja_id, (porLoja.get(f.loja_id) || 0) + v);
    porDia.set(f.data, (porDia.get(f.data) || 0) + v);
  });
  return {
    total,
    qtdFechamentos: fs.length,
    ticketMedio: ticketQtd > 0 ? ticketSoma / ticketQtd : 0,
    porFormaPagamento: Array.from(porFP, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    porCanal: Array.from(porCanal, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
    porLoja: Array.from(porLoja, ([loja_id, valor]) => ({ loja_id, valor })).sort((a, b) => b.valor - a.valor),
    porDia: Array.from(porDia, ([data, valor]) => ({ data, valor })).sort((a, b) => a.data.localeCompare(b.data)),
    fechamentos: fs,
  };
}

/* =========================================
 * CAIXA / FINANCEIRO
 * ========================================= */
export function calcularCaixa(base, lojaId) {
  const naturezaOf = (c) => c.natureza || (c.tipo === "cartao_pf" || c.tipo === "cheque_especial_pf" ? "PF_USO_OPERACIONAL" : "PJ");
  const contas = base.contasBancarias.filter((c) => c.ativo !== false && (!lojaId || !c.loja_id || c.loja_id === lojaId));
  const saldos = calcularSaldosBancarios(contas, base.movBancarias);
  let pj = 0, pf = 0, virtual = 0;
  contas.forEach((c) => {
    const s = saldos.get(c.id)?.saldo || 0;
    const nat = naturezaOf(c);
    if (nat === "PJ") pj += s;
    else if (nat === "PF_USO_OPERACIONAL") pf += s;
    else if (nat === "VIRTUAL_INTERNO") virtual += s;
  });
  // Cheque especial PF em uso = soma de saldos negativos PF
  const chequeEspecialPF = contas
    .filter((c) => naturezaOf(c) === "PF_USO_OPERACIONAL")
    .reduce((s, c) => s + Math.min(0, saldos.get(c.id)?.saldo || 0), 0);
  return { pj, pf, virtual, chequeEspecialPF: Math.abs(chequeEspecialPF), contas, saldos };
}

export function calcularContasPeriodo(base, lojaId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const dt7 = new Date(); dt7.setDate(dt7.getDate() + 7);
  const ate7 = dt7.toISOString().slice(0, 10);

  const filtra = (lista) => lista
    .filter((c) => c.status !== "paga" && c.status !== "recebida" && c.status !== "cancelada")
    .filter((c) => !c.banco_virtual && c.tipo_origem !== "interno")
    .filter((c) => !lojaId || c.loja_id === lojaId);

  const cp = filtra(base.contasPagar);
  const cr = filtra(base.contasReceber);

  const vencidasCP = cp.filter((c) => c.data_vencimento && c.data_vencimento < hoje);
  const hojeCP = cp.filter((c) => c.data_vencimento === hoje);
  const prox7CP = cp.filter((c) => c.data_vencimento && c.data_vencimento >= hoje && c.data_vencimento <= ate7);

  const vencidasCR = cr.filter((c) => c.data_vencimento && c.data_vencimento < hoje);
  const hojeCR = cr.filter((c) => c.data_vencimento === hoje);
  const prox7CR = cr.filter((c) => c.data_vencimento && c.data_vencimento >= hoje && c.data_vencimento <= ate7);

  const soma = (l) => l.reduce((s, c) => s + (num(c.valor) - num(c.valor_pago || c.valor_recebido)), 0);

  return {
    cp, cr,
    vencidasCP, hojeCP, prox7CP,
    vencidasCR, hojeCR, prox7CR,
    valorVencidasCP: soma(vencidasCP),
    valorHojeCP: soma(hojeCP),
    valorProx7CP: soma(prox7CP),
    valorVencidasCR: soma(vencidasCR),
    valorHojeCR: soma(hojeCR),
    valorProx7CR: soma(prox7CR),
    fluxoLiquido7: soma(prox7CR) - soma(prox7CP) - soma(vencidasCP) + soma(vencidasCR),
  };
}

/* =========================================
 * SÓCIO x EMPRESA
 * ========================================= */
export function calcularSocioEmpresa(base, lojaId, de, ate) {
  const movs = base.movSocio.filter((m) => {
    if (lojaId && m.loja_id && m.loja_id !== lojaId) return false;
    return m.status !== "cancelado";
  });
  const noPeriodo = movs.filter((m) => dentro(m.data, de, ate));

  let empresaDeveSocio = 0;   // a empresa precisa devolver/pagar ao sócio
  let socioDeveEmpresa = 0;   // sócio precisa devolver à empresa
  let retiradasMes = 0;
  let recebidoEmPF = 0;       // venda recebida em PF

  movs.forEach((m) => {
    const v = num(m.valor);
    switch (m.tipo_movimento) {
      case "despesa_empresa_paga_pela_pf":
      case "aporte_socio":
      case "emprestimo_socio":
      case "uso_cheque_especial_pf":
      case "juros_cheque_especial_pf":
        empresaDeveSocio += v; break;
      case "despesa_pessoal_paga_pela_empresa":
      case "recebimento_empresa_em_pf":
        socioDeveEmpresa += v; break;
      case "reembolso_ao_socio":
        empresaDeveSocio -= v; break;
      case "retirada_socio":
      case "devolucao_socio_empresa":
        socioDeveEmpresa -= v; break;
      default: break;
    }
  });
  noPeriodo.forEach((m) => {
    if (m.tipo_movimento === "retirada_socio") retiradasMes += num(m.valor);
    if (m.tipo_movimento === "recebimento_empresa_em_pf") recebidoEmPF += num(m.valor);
  });

  return {
    empresaDeveSocio: Math.max(0, empresaDeveSocio),
    socioDeveEmpresa: Math.max(0, socioDeveEmpresa),
    saldoLiquido: empresaDeveSocio - socioDeveEmpresa,
    retiradasMes,
    recebidoEmPF,
    movs: noPeriodo.slice(0, 10),
  };
}

/* =========================================
 * BANCO VIRTUAL CD/Lojas
 * ========================================= */
export function calcularBancoVirtual(base) {
  const saldos = calcularSaldosVirtuais(base.lancInternos);
  const porLoja = new Map();
  saldos.forEach((s) => {
    if (!s.loja_a) return;
    const cur = porLoja.get(s.loja_a) || 0;
    porLoja.set(s.loja_a, cur + (num(s.saldo)));
  });
  const total = Array.from(porLoja.values()).reduce((a, b) => a + b, 0);
  const pendentes = base.lancInternos.filter((l) => l.status === "pendente" || l.status === "aberto").length;
  const semana = (() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    const lim = d.toISOString().slice(0, 10);
    return base.lancInternos.filter((l) => (l.data || "") >= lim && l.tipo === "debito").reduce((s, l) => s + num(l.valor), 0);
  })();
  return { total, porLoja: Array.from(porLoja, ([loja_id, saldo]) => ({ loja_id, saldo })), pendentes, semana };
}

/* =========================================
 * OPERAÇÕES E ESTOQUE
 * ========================================= */
export function calcularOperacoes(base, lojaId, de, ate) {
  const insumos = base.insumos;
  const fichasMap = new Set(base.fichasTecnicas.map((f) => f.produto_id || f.id));
  const produtosSemFicha = base.produtos.filter((p) => p.ativo !== false && !fichasMap.has(p.id));

  const baixoMin = insumos.filter((i) => num(i.estoque_minimo) > 0 && num(i.estoque_atual) < num(i.estoque_minimo));
  const criticos = baixoMin.slice().sort((a, b) => (num(a.estoque_atual) / Math.max(num(a.estoque_minimo), 1)) - (num(b.estoque_atual) / Math.max(num(b.estoque_minimo), 1))).slice(0, 10);

  const inventariosPend = base.inventarios.filter((i) => i.status !== "concluido" && i.status !== "cancelado").length;
  const comprasPend = base.compras.filter((c) => c.status === "pendente" || c.status === "aberta" || c.status === "aguardando").length;
  const nfPend = base.notasFiscais.filter((n) => n.status === "pendente" || n.status === "aguardando_aprovacao").length;
  const opAbertas = base.ordensProducao.filter((o) => o.status !== "concluida" && o.status !== "cancelada").length;
  const perdasPeriodo = base.ajustesPerdas.filter((a) => dentro(a.data, de, ate) && (!lojaId || a.loja_id === lojaId)).length;

  return {
    baixoMin, criticos, inventariosPend, comprasPend, nfPend, opAbertas, perdasPeriodo,
    produtosSemFicha,
    notasPendentes: base.notasFiscais.filter((n) => n.status === "pendente" || n.status === "aguardando_aprovacao").slice(0, 5),
    opsAndamento: base.ordensProducao.filter((o) => o.status !== "concluida" && o.status !== "cancelada").slice(0, 5),
  };
}

/* =========================================
 * ROTINAS
 * ========================================= */
export function calcularRotinas(base, lojaId) {
  const filtra = (l) => l.filter((x) => !lojaId || x.loja_id === lojaId);
  const exec = filtra(base.checklistsExec);
  const concluidos = exec.filter((c) => c.status === "concluido").length;
  const pendentes = exec.filter((c) => c.status !== "concluido").length;
  const chamados = filtra(base.chamados);
  const abertos = chamados.filter((c) => c.status === "aberto" || c.status === "em_atendimento");
  const criticos = chamados.filter((c) => c.prioridade === "critica" && c.status !== "resolvido" && c.status !== "cancelado");
  const tarefas = filtra(base.tarefas);
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasadas = tarefas.filter((t) => t.status !== "concluida" && t.status !== "cancelada" && t.data_limite && t.data_limite < hoje);
  const manutPend = (base.manutencoes || []).filter((m) => m.status !== "concluida" && m.status !== "cancelado").length;
  return {
    concluidos, pendentes,
    abertos: abertos.length, criticos: criticos.length,
    atrasadas: atrasadas.length, manutPend,
    listaCriticos: criticos.slice(0, 5),
    listaAtrasadas: atrasadas.slice(0, 5),
    ultimasOcorrencias: filtra(base.ocorrenciasOp).slice(0, 5),
  };
}

/* =========================================
 * RH
 * ========================================= */
export function calcularRH(base, lojaId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const colabs = base.colaboradores.filter((c) => c.status === "ativo" && (!lojaId || c.loja_id === lojaId));
  const pontosHoje = base.registrosPonto.filter((p) => (p.horario || "").slice(0, 10) === hoje && (!lojaId || p.loja_id === lojaId));
  const presentes = new Set(pontosHoje.filter((p) => p.tipo === "entrada").map((p) => p.colaborador_id)).size;

  const semBater = colabs.filter((c) => !pontosHoje.some((p) => p.colaborador_id === c.id));
  const pendRevisao = base.registrosPonto.filter((p) => p.status === "pendente_revisao" && (!lojaId || p.loja_id === lojaId)).length;
  const baixaConfianca = base.registrosPonto.filter((p) => p.ia_resultado === "baixa_confianca" && (!lojaId || p.loja_id === lojaId)).slice(0, 5);
  const solicPend = base.solicitacoesRH.filter((s) => s.status === "pendente" || s.status === "aberta");
  const escalasVazias = base.escalas.filter((e) => !e.escalas_dia || e.escalas_dia.length === 0).length;

  return {
    presentes, total: colabs.length,
    semBaterCount: semBater.length, semBaterLista: semBater.slice(0, 5),
    pendRevisao, baixaConfianca,
    solicPend: solicPend.length, solicLista: solicPend.slice(0, 5),
    escalasVazias,
  };
}

/* =========================================
 * MARKETING
 * ========================================= */
export function calcularMarketing(base, de, ate) {
  const ativas = base.campanhas.filter((c) => c.status === "ativa" || c.status === "em_andamento");
  const vencendo = base.campanhas.filter((c) => c.data_fim && c.data_fim >= (de || "") && c.data_fim <= (ate || "9999-12-31"));
  const cuponsAtivos = base.cupons.filter((c) => c.ativo !== false);
  const cuponsUsados = base.cupons.filter((c) => num(c.qtd_usada) > 0);
  const inativos = base.clientes.filter((c) => {
    if (!c.ultima_compra) return true;
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);
    return c.ultima_compra < d90.toISOString().slice(0, 10);
  });
  return {
    ativasCount: ativas.length, ativas: ativas.slice(0, 5),
    cuponsUsadosCount: cuponsUsados.length, cuponsAtivos: cuponsAtivos.slice(0, 5),
    inativosCount: inativos.length, vencendo: vencendo.slice(0, 5),
  };
}

/* =========================================
 * ATENDIMENTO
 * ========================================= */
export function calcularAtendimento(base, lojaId, de, ate) {
  const filtra = (l) => l.filter((x) => (!lojaId || x.loja_id === lojaId));
  const recls = filtra(base.reclamacoes);
  const abertas = recls.filter((r) => r.status_tratativa !== "resolvida" && r.status_tratativa !== "improcedente" && r.status_tratativa !== "cancelada");
  const periodo = filtra(base.avaliacoes).filter((a) => dentro(a.data, de, ate));
  const npsScores = periodo.filter((a) => num(a.nps_score) > 0).map((a) => num(a.nps_score));
  const nps = npsScores.length > 0 ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length : 0;
  const cortesias = filtra(base.cortesias).filter((c) => dentro(c.data, de, ate)).length;
  const reembolsos = filtra(base.reembolsos).filter((c) => dentro(c.data, de, ate)).length;
  const motivos = new Map();
  recls.forEach((r) => motivos.set(r.motivo || "outro", (motivos.get(r.motivo || "outro") || 0) + 1));
  const principaisMotivos = Array.from(motivos, ([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 3);
  return {
    abertasCount: abertas.length, abertas: abertas.slice(0, 5),
    avaliacoesCount: periodo.length, nps, cortesias, reembolsos, principaisMotivos,
  };
}

/* =========================================
 * DRE GERENCIAL RESUMIDA
 * ========================================= */
export function calcularDREResumido(base, lojaId, de, ate) {
  const fs = base.fechamentos.filter((f) => {
    if (lojaId && f.loja_id !== lojaId) return false;
    if (!dentro(f.data, de, ate)) return false;
    const st = f.status || "fechado";
    return st === "aprovado" || st === "fechado";
  });
  const receitaBruta = fs.reduce((s, f) => s + num(f.total_vendas) || s + num(f.total_bruto), 0);
  const taxas = fs.reduce((s, f) => s + num(f.total_taxas), 0);

  const catMap = new Map(base.categorias.map((c) => [c.id, c]));
  const cps = base.contasPagar.filter((c) => {
    if (lojaId && c.loja_id !== lojaId) return false;
    if (c.banco_virtual || c.tipo_origem === "interno") return false;
    if (c.status === "cancelada") return false;
    const ref = c.data_pagamento || c.data_vencimento;
    return dentro(ref, de, ate);
  });

  const grupos = {};
  cps.forEach((c) => {
    const cat = catMap.get(c.categoria_id);
    if (!cat || !cat.impacta_dre) return;
    const g = cat.grupo_dre || "Despesas Administrativas";
    grupos[g] = (grupos[g] || 0) + (num(c.valor_pago) || num(c.valor));
  });

  const get = (k) => grupos[k] || 0;
  const cmv = get("CMV");
  const deducoes = get("Deduções da Receita") + taxas;
  const receitaLiquida = receitaBruta - deducoes;
  const lucroBruto = receitaLiquida - cmv;
  const mo = get("Mão de Obra");
  const desOp = get("Despesas Operacionais");
  const mkt = get("Marketing e Comercial");
  const delivery = get("Delivery e Logística");
  const adm = get("Despesas Administrativas");
  const fin = get("Despesas Financeiras");
  const imp = get("Impostos e Taxas");
  const inv = get("Investimentos");
  const resultado = lucroBruto - mo - desOp - mkt - delivery - adm - fin - imp;
  return {
    receitaBruta, deducoes, receitaLiquida,
    cmv, lucroBruto, mo, desOp, mkt, delivery, adm, fin, imp, inv,
    resultado,
    margem: receitaBruta > 0 ? (resultado / receitaBruta) * 100 : 0,
  };
}

/* =========================================
 * ALERTAS CRÍTICOS
 * ========================================= */
export function gerarAlertas(base, lojaId, de, ate) {
  const a = [];
  const hoje = new Date().toISOString().slice(0, 10);

  // Caixa: cheque especial PF em uso
  const caixa = calcularCaixa(base, lojaId);
  if (caixa.chequeEspecialPF > 0) {
    a.push({ severidade: "alta", titulo: "Cheque especial PF em uso", detalhe: `R$ ${caixa.chequeEspecialPF.toFixed(2)} consumido(s)`, link: "/admin/financeiro/socio-empresa/dashboard" });
  }

  // Contas: vencidas, vence hoje
  const contas = calcularContasPeriodo(base, lojaId);
  if (contas.vencidasCP.length > 0) {
    a.push({ severidade: "critica", titulo: `${contas.vencidasCP.length} conta(s) a pagar vencida(s)`, detalhe: `R$ ${contas.valorVencidasCP.toFixed(2)}`, link: "/admin/financeiro/contas-a-pagar/contas" });
  }
  if (contas.hojeCP.length > 0) {
    a.push({ severidade: "alta", titulo: `${contas.hojeCP.length} conta(s) vencendo hoje`, detalhe: `R$ ${contas.valorHojeCP.toFixed(2)}`, link: "/admin/financeiro/contas-a-pagar/contas" });
  }

  // Fechamento não lançado
  const lojasFiltradas = lojaId ? base.lojas.filter((l) => l.id === lojaId) : base.lojas.filter((l) => l.tipo !== "cd");
  const semHoje = lojasFiltradas.filter((l) => !base.fechamentos.some((f) => f.loja_id === l.id && f.data === hoje));
  if (semHoje.length > 0) {
    a.push({ severidade: "media", titulo: `${semHoje.length} loja(s) sem fechamento hoje`, detalhe: semHoje.map((l) => l.nome).join(", "), link: "/admin/vendas/fechamentos" });
  }

  // Caixa divergente
  const divergentes = base.fechamentos.filter((f) => dentro(f.data, de, ate) && Math.abs(num(f.diferenca_caixa)) > 5);
  if (divergentes.length > 0) {
    a.push({ severidade: "alta", titulo: `${divergentes.length} caixa(s) com divergência`, detalhe: "Diferença > R$ 5,00", link: "/admin/vendas/conferencia" });
  }

  // Estoque crítico
  const op = calcularOperacoes(base, lojaId, de, ate);
  if (op.baixoMin.length > 0) {
    a.push({ severidade: "alta", titulo: `${op.baixoMin.length} item(ns) abaixo do mínimo`, detalhe: "Repor estoque", link: "/admin/operacoes/estoque" });
  }
  if (op.nfPend > 0) {
    a.push({ severidade: "media", titulo: `${op.nfPend} nota(s) fiscal(is) pendente(s)`, detalhe: "Aguardando aprovação do gestor", link: "/admin/operacoes/notas-fiscais" });
  }

  // RH
  const rh = calcularRH(base, lojaId);
  if (rh.pendRevisao > 0) {
    a.push({ severidade: "media", titulo: `${rh.pendRevisao} ponto(s) pendente(s) de revisão`, link: "/admin/aprovacoes" });
  }

  // Rotinas
  const rt = calcularRotinas(base, lojaId);
  if (rt.criticos > 0) {
    a.push({ severidade: "critica", titulo: `${rt.criticos} chamado(s) crítico(s) aberto(s)`, link: "/admin/rotinas/chamados" });
  }
  if (rt.atrasadas > 0) {
    a.push({ severidade: "media", titulo: `${rt.atrasadas} tarefa(s) atrasada(s)`, link: "/admin/rotinas/tarefas" });
  }

  // Sócio: retirada acima do limite (R$ 10k/mês default — placeholder)
  const se = calcularSocioEmpresa(base, lojaId, de, ate);
  if (se.recebidoEmPF > 0) {
    a.push({ severidade: "alta", titulo: "Vendas recebidas em conta PF", detalhe: `R$ ${se.recebidoEmPF.toFixed(2)} ainda não transferido para PJ`, link: "/admin/financeiro/socio-empresa/dashboard" });
  }

  const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
  return a.sort((x, y) => (ordem[x.severidade] ?? 9) - (ordem[y.severidade] ?? 9));
}

export const fmtBRL = (n) => `R$ ${(Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;