/**
 * Motor de cálculo do Espelho de Ponto — Checkpoint 4.
 *
 * Função pura: dado um conjunto de registros do dia + a jornada esperada +
 * lista de feriados + configurações de ponto, calcula:
 *  - minutos trabalhados (descontando intervalo)
 *  - minutos de atraso
 *  - minutos de saída antecipada
 *  - minutos de intervalo realizado
 *  - minutos de hora extra (50% dia normal / 100% domingo+feriado)
 *  - minutos com adicional noturno (real e ficto)
 *  - status do dia (falta / atraso / ok / feriado / sem_jornada)
 *
 * NÃO altera registros nem chama o backend. É chamado APENAS pela UI do
 * espelho. A criação de RegistroPonto continua sendo exclusiva do
 * registrarPontoSeguro.
 */

/* ---------- helpers básicos ---------- */

const MIN_DIA = 24 * 60;

/** "HH:MM" → minutos desde 00:00 */
function hhmmParaMin(s) {
  if (!s || typeof s !== "string") return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Date → minutos desde 00:00 do dia local */
function dataParaMinDia(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/** Sobreposição entre [a1,a2] e [b1,b2] em minutos (todos em min do dia) */
function sobreposicao(a1, a2, b1, b2) {
  const ini = Math.max(a1, b1);
  const fim = Math.min(a2, b2);
  return Math.max(0, fim - ini);
}

/* ---------- coleta dos registros do dia ---------- */

function mapearEventos(registros) {
  const ativos = (registros || []).filter((r) => r.status !== "rejeitado");
  const map = {};
  for (const r of ativos) {
    // Se houver duplicidade, mantém o primeiro (mais antigo) por tipo
    if (!map[r.tipo]) map[r.tipo] = new Date(r.horario);
  }
  return map;
}

/** Minutos trabalhados líquidos (entrada→saída menos intervalo). */
export function calcularTrabalhadosMin(registros) {
  const ev = mapearEventos(registros);
  if (!ev.entrada || !ev.saida) return 0;
  let total = (ev.saida - ev.entrada) / 60000;
  if (ev.intervalo_saida && ev.intervalo_volta) {
    total -= (ev.intervalo_volta - ev.intervalo_saida) / 60000;
  }
  return Math.max(0, Math.round(total));
}

/** Minutos de intervalo efetivamente realizado (0 se não houver par). */
export function calcularIntervaloRealizadoMin(registros) {
  const ev = mapearEventos(registros);
  if (!ev.intervalo_saida || !ev.intervalo_volta) return 0;
  return Math.max(0, Math.round((ev.intervalo_volta - ev.intervalo_saida) / 60000));
}

/* ---------- adicional noturno ---------- */

/**
 * Calcula minutos trabalhados dentro da faixa noturna.
 * Considera que a faixa pode atravessar a meia-noite (ex: 22:00–05:00).
 *
 * Retorna { reais, fictos } — fictos = reais convertidos em hora reduzida
 * (52'30" = 60' ficto). Padrão CLT urbano.
 */
export function calcularNoturnoMin(registros, { inicio, fim, usaHoraReduzida }) {
  const ev = mapearEventos(registros);
  if (!ev.entrada || !ev.saida) return { reais: 0, fictos: 0 };

  const iniMin = hhmmParaMin(inicio);
  const fimMin = hhmmParaMin(fim);
  if (iniMin == null || fimMin == null) return { reais: 0, fictos: 0 };

  const entrMin = dataParaMinDia(ev.entrada);
  let saidaMin = dataParaMinDia(ev.saida);
  // Se saída < entrada, atravessou a meia-noite
  if (saidaMin <= entrMin) saidaMin += MIN_DIA;

  // Faixa noturna como dois intervalos (cobrindo o dia "estendido" até 48h)
  // Exemplo: 22:00–05:00 → [22:00, 24:00] ∪ [24:00+0, 24:00+5:00] ∪ [24:00+22, 48:00]
  const faixas = [];
  if (iniMin < fimMin) {
    // não atravessa meia-noite (ex: 23:00–05:59 → único intervalo seria sem atravessar)
    faixas.push([iniMin, fimMin]);
    faixas.push([iniMin + MIN_DIA, fimMin + MIN_DIA]);
  } else {
    // atravessa meia-noite (ex: 22:00–05:00)
    faixas.push([iniMin, MIN_DIA]);                  // dia 1: 22→24
    faixas.push([MIN_DIA, fimMin + MIN_DIA]);        // dia 2: 0→5
    faixas.push([iniMin + MIN_DIA, MIN_DIA * 2]);    // overlap caso jornada longa
  }

  let reais = 0;
  for (const [b1, b2] of faixas) {
    reais += sobreposicao(entrMin, saidaMin, b1, b2);
  }

  // Desconta intervalo se ocorreu dentro da faixa noturna
  if (ev.intervalo_saida && ev.intervalo_volta) {
    let iMin = dataParaMinDia(ev.intervalo_saida);
    let vMin = dataParaMinDia(ev.intervalo_volta);
    if (iMin < entrMin) iMin += MIN_DIA;
    if (vMin < iMin) vMin += MIN_DIA;
    for (const [b1, b2] of faixas) {
      reais -= sobreposicao(iMin, vMin, b1, b2);
    }
  }

  reais = Math.max(0, Math.round(reais));
  // Hora reduzida: 52'30" reais = 60' fictos → fator 60/52,5 = 8/7
  const fictos = usaHoraReduzida ? Math.round(reais * (8 / 7)) : reais;
  return { reais, fictos };
}

/* ---------- diagnóstico do dia (atraso, falta, saída antecipada) ---------- */

/**
 * Retorna { status, atraso_min, saida_antecipada_min, esperado_min }.
 * status ∈ "ok" | "atraso" | "falta" | "feriado" | "sem_jornada"
 */
export function diagnosticoDiaCalculado(escalaDia, registros, feriadoDoDia, jornada) {
  const ev = mapearEventos(registros);
  const esperado = jornada?.carga_horaria_diaria_min ?? escalaDia?.carga_horaria_diaria_min ?? 0;

  if (feriadoDoDia && !feriadoDoDia.trabalhado) {
    return {
      status: "feriado",
      atraso_min: 0,
      saida_antecipada_min: 0,
      esperado_min: 0,
      feriado_nome: feriadoDoDia.nome,
    };
  }

  if (!escalaDia || escalaDia.tipo !== "normal") {
    return {
      status: "sem_jornada",
      atraso_min: 0,
      saida_antecipada_min: 0,
      esperado_min: esperado,
    };
  }

  if (!ev.entrada) {
    return { status: "falta", atraso_min: 0, saida_antecipada_min: 0, esperado_min: esperado };
  }

  const tolEntrada = jornada?.tolerancia_atraso_min ?? 10;
  const tolSaida = jornada?.tolerancia_saida_antecipada_min ?? 10;

  let atraso = 0;
  if (escalaDia.hora_entrada) {
    const [hh, mm] = escalaDia.hora_entrada.split(":").map(Number);
    const esperadaEntrada = new Date(escalaDia.data + "T00:00:00");
    esperadaEntrada.setHours(hh, mm, 0, 0);
    const diff = Math.round((ev.entrada - esperadaEntrada) / 60000);
    if (diff > tolEntrada) atraso = diff;
  }

  let antecipada = 0;
  if (ev.saida && escalaDia.hora_saida) {
    const [hh, mm] = escalaDia.hora_saida.split(":").map(Number);
    const esperadaSaida = new Date(escalaDia.data + "T00:00:00");
    esperadaSaida.setHours(hh, mm, 0, 0);
    const diff = Math.round((esperadaSaida - ev.saida) / 60000);
    if (diff > tolSaida) antecipada = diff;
  }

  return {
    status: atraso > 0 ? "atraso" : "ok",
    atraso_min: atraso,
    saida_antecipada_min: antecipada,
    esperado_min: esperado,
  };
}

/* ---------- hora extra ---------- */

/**
 * Calcula HE em minutos, separado por percentual aplicável.
 * Regra simples (conservadora):
 *  - tudo que exceder a carga diária esperada (jornada.carga_horaria_diaria_min) = HE
 *  - se for domingo OU feriado trabalhado → HE 100%
 *  - caso contrário → HE 50%
 * Respeita o limite diário configurado.
 */
export function calcularHoraExtraMin({
  trabalhado_min,
  esperado_min,
  dataISO,
  feriadoDoDia,
  config,
}) {
  if (!trabalhado_min || !esperado_min) return { he50_min: 0, he100_min: 0, excedeu_limite: false };
  const excesso = Math.max(0, trabalhado_min - esperado_min);
  if (excesso === 0) return { he50_min: 0, he100_min: 0, excedeu_limite: false };

  const diaSemana = new Date(dataISO + "T00:00:00").getDay(); // 0=dom
  const domingo = diaSemana === 0;
  const feriadoTrab = !!(feriadoDoDia && feriadoDoDia.trabalhado);

  const limite = Number(config?.["ponto.hora_extra.limite_diario_min"] ?? 120);
  const aplicado = Math.min(excesso, limite);
  const excedeu = excesso > limite;

  if (domingo || feriadoTrab) {
    return { he50_min: 0, he100_min: aplicado, excedeu_limite: excedeu };
  }
  return { he50_min: aplicado, he100_min: 0, excedeu_limite: excedeu };
}

/* ---------- função orquestradora ---------- */

/**
 * Resumo completo de um dia, pronto para ser exibido no Espelho.
 *
 * @param {object} params
 * @param {string} params.dataISO              "YYYY-MM-DD"
 * @param {Array}  params.registros            RegistroPonto do dia
 * @param {object} params.escalaDia            Escala do dia (ou null)
 * @param {object} params.jornada              JornadaTrabalho aplicável (ou null)
 * @param {object} params.feriadoDoDia         Feriado que cobre essa data (ou null)
 * @param {object} params.config               objeto de ponto-config-service.carregarConfigPonto()
 */
export function resumoDia({ dataISO, registros, escalaDia, jornada, feriadoDoDia, config }) {
  const trabalhado_min = calcularTrabalhadosMin(registros);
  const intervalo_realizado_min = calcularIntervaloRealizadoMin(registros);

  const diag = diagnosticoDiaCalculado(escalaDia, registros, feriadoDoDia, jornada);

  const he = calcularHoraExtraMin({
    trabalhado_min,
    esperado_min: diag.esperado_min,
    dataISO,
    feriadoDoDia,
    config,
  });

  const noturno = calcularNoturnoMin(registros, {
    inicio: config?.["ponto.noturno.hora_inicio"] || "22:00",
    fim: config?.["ponto.noturno.hora_fim"] || "05:00",
    usaHoraReduzida: !!config?.["ponto.noturno.usa_hora_reduzida"],
  });

  // Saldo dia = trabalhado - esperado (positivo = sobrou, negativo = faltou)
  const saldo_min = diag.esperado_min ? trabalhado_min - diag.esperado_min : 0;

  // Alerta de intervalo
  const intervalo_obrigatorio = Number(config?.["ponto.intervalo.obrigatorio_min"] ?? 60);
  const alerta_intervalo =
    trabalhado_min > 6 * 60 &&
    intervalo_realizado_min < intervalo_obrigatorio &&
    !!config?.["ponto.intervalo.alertar_nao_realizado"];

  return {
    data: dataISO,
    status: diag.status,
    feriado_nome: diag.feriado_nome || null,
    esperado_min: diag.esperado_min,
    trabalhado_min,
    saldo_min,
    atraso_min: diag.atraso_min,
    saida_antecipada_min: diag.saida_antecipada_min,
    intervalo_realizado_min,
    alerta_intervalo,
    he50_min: he.he50_min,
    he100_min: he.he100_min,
    he_excedeu_limite: he.excedeu_limite,
    noturno_real_min: noturno.reais,
    noturno_ficto_min: noturno.fictos,
  };
}

/* ---------- totalizador do período ---------- */

export function totalizarPeriodo(resumos) {
  const acc = {
    dias: resumos.length,
    esperado_min: 0,
    trabalhado_min: 0,
    saldo_min: 0,
    atraso_min: 0,
    saida_antecipada_min: 0,
    he50_min: 0,
    he100_min: 0,
    noturno_real_min: 0,
    noturno_ficto_min: 0,
    faltas: 0,
    atrasos: 0,
    feriados: 0,
  };
  for (const r of resumos) {
    acc.esperado_min += r.esperado_min || 0;
    acc.trabalhado_min += r.trabalhado_min || 0;
    acc.saldo_min += r.saldo_min || 0;
    acc.atraso_min += r.atraso_min || 0;
    acc.saida_antecipada_min += r.saida_antecipada_min || 0;
    acc.he50_min += r.he50_min || 0;
    acc.he100_min += r.he100_min || 0;
    acc.noturno_real_min += r.noturno_real_min || 0;
    acc.noturno_ficto_min += r.noturno_ficto_min || 0;
    if (r.status === "falta") acc.faltas += 1;
    if (r.status === "atraso") acc.atrasos += 1;
    if (r.status === "feriado") acc.feriados += 1;
  }
  return acc;
}