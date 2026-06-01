/**
 * Serviço de Fechamento Mensal de Ponto — Checkpoint 4.
 *
 * - Calcula os totais oficiais por colaborador usando o motor já existente
 *   (lib/ponto-calculo-service.js).
 * - Persiste 1 FechamentoMensalPonto por colaborador na competência.
 * - Persiste 1 FechamentoPeriodoPonto que representa a "trava" do mês.
 *
 * NUNCA altera RegistroPonto. A trava é lida via isPeriodoFechado() antes
 * de qualquer ajuste — quem barra a edição é a UI/serviço de ajustes.
 */
import { base44 } from "@/api/base44Client";
import { resumoDia, totalizarPeriodo } from "@/lib/ponto-calculo-service";
import { carregarConfigPonto } from "@/lib/ponto-config-service";
import { registrarLog } from "@/lib/auditoria-service";

/* ---------- helpers de período ---------- */

/** "AAAA-MM" → { data_inicio: "AAAA-MM-01", data_fim: "AAAA-MM-DD" (último dia) } */
export function periodoDaCompetencia(competencia) {
  const [a, m] = competencia.split("-").map(Number);
  const inicio = new Date(a, m - 1, 1);
  const fim = new Date(a, m, 0); // dia 0 do próximo mês = último dia desse mês
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { data_inicio: fmt(inicio), data_fim: fmt(fim) };
}

/* ---------- carregamento ---------- */

export async function getPeriodo(competencia, loja_id = "") {
  const list = await base44.entities.FechamentoPeriodoPonto.filter({
    competencia,
    loja_id: loja_id || "",
  });
  return list[0] || null;
}

export async function listarPeriodos() {
  return base44.entities.FechamentoPeriodoPonto.list("-competencia", 60);
}

export async function listarFechamentosDoPeriodo(periodo_id) {
  return base44.entities.FechamentoMensalPonto.filter({ periodo_id });
}

export async function isPeriodoFechado(competencia, loja_id = "") {
  const p = await getPeriodo(competencia, loja_id);
  return p?.status === "fechado";
}

/* ---------- cálculo do mês de um colaborador ---------- */

async function calcularMesColaborador({
  competencia,
  colaborador,
  jornadas,
  feriados,
  registrosDoColab,
  escalasDoColab,
  config,
}) {
  const { data_inicio, data_fim } = periodoDaCompetencia(competencia);

  // jornada do colaborador (fallback: primeira ativa)
  const jornada =
    jornadas.find((j) => j.id === colaborador.jornada_id) || jornadas[0] || null;

  // agrupa por dia
  const map = new Map();
  for (const r of registrosDoColab) {
    if (r.data < data_inicio || r.data > data_fim) continue;
    const cur = map.get(r.data) || { data: r.data, registros: [], escala: null };
    cur.registros.push(r);
    map.set(r.data, cur);
  }
  for (const e of escalasDoColab) {
    if (e.data < data_inicio || e.data > data_fim) continue;
    const cur = map.get(e.data) || { data: e.data, registros: [], escala: null };
    cur.escala = e;
    map.set(e.data, cur);
  }

  // mapa de feriados (loja específica tem precedência sobre nacional)
  const feriadoPorData = {};
  for (const f of feriados) {
    if (!feriadoPorData[f.data]) feriadoPorData[f.data] = f;
    else if (f.loja_id && colaborador.loja_id === f.loja_id)
      feriadoPorData[f.data] = f;
  }

  const dias = Array.from(map.values()).sort((a, b) =>
    a.data.localeCompare(b.data)
  );

  const resumos = dias.map((d) =>
    resumoDia({
      dataISO: d.data,
      registros: d.registros,
      escalaDia: d.escala,
      jornada,
      feriadoDoDia: feriadoPorData[d.data] || null,
      config,
    })
  );

  const totais = totalizarPeriodo(resumos);

  return {
    colaborador,
    jornada_id: jornada?.id || "",
    data_inicio,
    data_fim,
    dias_uteis: resumos.filter((r) => r.status !== "feriado" && r.esperado_min > 0).length,
    dias_trabalhados: resumos.filter((r) => r.trabalhado_min > 0).length,
    dias_falta: totais.faltas,
    dias_feriado: totais.feriados,
    esperado_min: totais.esperado_min,
    trabalhado_min: totais.trabalhado_min,
    saldo_min: totais.saldo_min,
    he50_min: totais.he50_min,
    he100_min: totais.he100_min,
    noturno_real_min: totais.noturno_real_min,
    noturno_ficto_min: totais.noturno_ficto_min,
    atraso_min: totais.atraso_min,
    saida_antecipada_min: totais.saida_antecipada_min,
    resumos,
  };
}

/* ---------- prévia (não persiste) ---------- */

/**
 * Calcula os totalizadores do mês sem gravar nada.
 * Usado na tela de Fechamento Mensal para mostrar a prévia.
 */
export async function previaFechamento({ competencia, loja_id = "" }) {
  const { data_inicio, data_fim } = periodoDaCompetencia(competencia);

  const [colaboradores, jornadas, feriados, config, registros, escalas] = await Promise.all([
    base44.entities.Colaborador.filter({ status: "ativo" }),
    base44.entities.JornadaTrabalho.filter({ ativo: true }).catch(() => []),
    base44.entities.Feriado.filter({ ativo: true }).catch(() => []),
    carregarConfigPonto().catch(() => ({})),
    base44.entities.RegistroPonto.list("-horario", 10000),
    base44.entities.Escala.list("-data", 10000),
  ]);

  const colabsFiltrados = loja_id
    ? colaboradores.filter((c) => c.loja_id === loja_id)
    : colaboradores;

  const linhas = [];
  for (const colab of colabsFiltrados) {
    const regs = registros.filter((r) => r.colaborador_id === colab.id);
    const esc = escalas.filter((e) => e.colaborador_id === colab.id);
    const m = await calcularMesColaborador({
      competencia,
      colaborador: colab,
      jornadas,
      feriados,
      registrosDoColab: regs,
      escalasDoColab: esc,
      config,
    });
    linhas.push(m);
  }

  // totais consolidados
  const totalGeral = linhas.reduce(
    (acc, l) => ({
      qtd_colaboradores: acc.qtd_colaboradores + 1,
      total_trabalhado_min: acc.total_trabalhado_min + l.trabalhado_min,
      total_he50_min: acc.total_he50_min + l.he50_min,
      total_he100_min: acc.total_he100_min + l.he100_min,
      total_noturno_min: acc.total_noturno_min + l.noturno_ficto_min,
      total_atraso_min: acc.total_atraso_min + l.atraso_min,
      total_faltas: acc.total_faltas + l.dias_falta,
    }),
    {
      qtd_colaboradores: 0,
      total_trabalhado_min: 0,
      total_he50_min: 0,
      total_he100_min: 0,
      total_noturno_min: 0,
      total_atraso_min: 0,
      total_faltas: 0,
    }
  );

  return { data_inicio, data_fim, linhas, totalGeral };
}

/* ---------- ações: fechar / reabrir ---------- */

export async function fecharPeriodo({ competencia, loja_id = "", observacoes = "" }) {
  const existente = await getPeriodo(competencia, loja_id);
  if (existente?.status === "fechado") {
    throw new Error("Este período já está fechado.");
  }

  const { data_inicio, data_fim, linhas, totalGeral } = await previaFechamento({
    competencia,
    loja_id,
  });

  let usuario = null;
  try { usuario = await base44.auth.me(); } catch { /* */ }
  const fechado_em = new Date().toISOString();
  const fechado_por = usuario?.email || "";

  // 1) cria/atualiza o registro pai do período
  const periodoPayload = {
    competencia,
    loja_id: loja_id || "",
    data_inicio,
    data_fim,
    status: "fechado",
    qtd_colaboradores: totalGeral.qtd_colaboradores,
    total_trabalhado_min: totalGeral.total_trabalhado_min,
    total_he50_min: totalGeral.total_he50_min,
    total_he100_min: totalGeral.total_he100_min,
    total_noturno_min: totalGeral.total_noturno_min,
    total_atraso_min: totalGeral.total_atraso_min,
    total_faltas: totalGeral.total_faltas,
    fechado_por,
    fechado_em,
    observacoes,
  };

  const periodo = existente
    ? await base44.entities.FechamentoPeriodoPonto.update(existente.id, periodoPayload)
    : await base44.entities.FechamentoPeriodoPonto.create(periodoPayload);

  const periodo_id = periodo?.id || existente?.id;

  // 2) limpa filhos antigos (caso seja refechamento)
  if (existente) {
    const antigos = await base44.entities.FechamentoMensalPonto.filter({ periodo_id });
    for (const a of antigos) {
      try { await base44.entities.FechamentoMensalPonto.delete(a.id); } catch { /* */ }
    }
  }

  // 3) cria 1 fechamento por colaborador
  for (const l of linhas) {
    await base44.entities.FechamentoMensalPonto.create({
      competencia,
      periodo_id,
      colaborador_id: l.colaborador.id,
      colaborador_nome: l.colaborador.nome,
      loja_id: l.colaborador.loja_id || "",
      cargo_id: l.colaborador.cargo_id || "",
      jornada_id: l.jornada_id || "",
      data_inicio: l.data_inicio,
      data_fim: l.data_fim,
      dias_uteis: l.dias_uteis,
      dias_trabalhados: l.dias_trabalhados,
      dias_falta: l.dias_falta,
      dias_feriado: l.dias_feriado,
      esperado_min: l.esperado_min,
      trabalhado_min: l.trabalhado_min,
      saldo_min: l.saldo_min,
      he50_min: l.he50_min,
      he100_min: l.he100_min,
      noturno_real_min: l.noturno_real_min,
      noturno_ficto_min: l.noturno_ficto_min,
      atraso_min: l.atraso_min,
      saida_antecipada_min: l.saida_antecipada_min,
      status: "fechado",
      fechado_por,
      fechado_em,
      snapshot_resumos: JSON.stringify(l.resumos).slice(0, 50000),
    });
  }

  await registrarLog({
    modulo: "rh",
    acao: "executar",
    entidade: "FechamentoPeriodoPonto",
    entidade_id: periodo_id,
    descricao: `Fechamento mensal de ponto ${competencia}${loja_id ? ` (loja ${loja_id})` : ""} concluído com ${linhas.length} colaboradores.`,
    origem: "humano",
    loja_id: loja_id || undefined,
    critico: true,
  }).catch(() => {});

  return periodo;
}

export async function reabrirPeriodo({ periodo_id, motivo }) {
  if (!motivo || motivo.trim().length < 5) {
    throw new Error("Informe um motivo (mínimo 5 caracteres) para reabrir o período.");
  }
  let usuario = null;
  try { usuario = await base44.auth.me(); } catch { /* */ }

  const atualizado = await base44.entities.FechamentoPeriodoPonto.update(periodo_id, {
    status: "reaberto",
    reaberto_por: usuario?.email || "",
    reaberto_em: new Date().toISOString(),
    reaberto_motivo: motivo,
  });

  // marca filhos como reabertos também
  const filhos = await base44.entities.FechamentoMensalPonto.filter({ periodo_id });
  for (const f of filhos) {
    try { await base44.entities.FechamentoMensalPonto.update(f.id, { status: "reaberto" }); } catch { /* */ }
  }

  await registrarLog({
    modulo: "rh",
    acao: "executar",
    entidade: "FechamentoPeriodoPonto",
    entidade_id: periodo_id,
    descricao: `Período de ponto reaberto. Motivo: ${motivo}`,
    origem: "humano",
    critico: true,
    justificativa: motivo,
  }).catch(() => {});

  return atualizado;
}