import { base44 } from "@/api/base44Client";

/**
 * Retorna o Colaborador correspondente ao usuário logado (matching por email),
 * ou null se não houver vínculo.
 */
export async function getColaboradorAtual() {
  try {
    const u = await base44.auth.me();
    if (!u?.email) return null;
    const list = await base44.entities.Colaborador.filter({ email: u.email });
    return list[0] || null;
  } catch {
    return null;
  }
}

/** É gestor no PWA: User.role === 'admin' OU Colaborador.perfil_pwa === 'gestor' */
export function isGestor(user, colaborador) {
  if (user?.role === "admin") return true;
  if (colaborador?.perfil_pwa === "gestor") return true;
  return false;
}

/** Retorna o tipo do próximo evento de ponto possível, dado os registros do dia. */
export function proximoEventoPonto(registrosDoDia) {
  const tipos = registrosDoDia.map((r) => r.tipo);
  if (!tipos.includes("entrada")) return "entrada";
  if (!tipos.includes("intervalo_saida")) return "intervalo_saida";
  if (!tipos.includes("intervalo_volta")) return "intervalo_volta";
  if (!tipos.includes("saida")) return "saida";
  return null; // dia completo
}

const LABEL_PONTO = {
  entrada: "Entrada",
  intervalo_saida: "Saída intervalo",
  intervalo_volta: "Volta intervalo",
  saida: "Saída",
};
export const labelPonto = (t) => LABEL_PONTO[t] || t;

/**
 * Calcula horas trabalhadas (em minutos) a partir dos registros do dia.
 * Suporta entrada/saida e desconta intervalo se houver par completo.
 */
export function calcularMinutosTrabalhados(registros) {
  const map = {};
  for (const r of registros) map[r.tipo] = new Date(r.horario);
  let total = 0;
  if (map.entrada && map.saida) {
    total = (map.saida - map.entrada) / 60000;
    if (map.intervalo_saida && map.intervalo_volta) {
      total -= (map.intervalo_volta - map.intervalo_saida) / 60000;
    }
  }
  return Math.max(0, Math.round(total));
}

export function formatMinutos(min) {
  if (!min || min < 0) return "00:00";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Compara escala vs registros e classifica a situação do dia.
 * Status possíveis:
 *  sem_jornada | falta | atraso | em_intervalo | sem_saida |
 *  incompleto | saida_antecipada | sequencia_quebrada | encerrado | ok
 * `exececao` = true para qualquer caso que mereça destaque/tratamento.
 */
export function diagnosticoDia(escalaDia, registros) {
  if (!escalaDia || escalaDia.tipo !== "normal") {
    // Sem jornada: só é exceção se houver alguma batida solta.
    return { status: "sem_jornada", atraso_min: 0, saida_antecipada_min: 0, exececao: registros.length > 0 };
  }

  const entrada = registros.find((r) => r.tipo === "entrada");
  const intSaida = registros.find((r) => r.tipo === "intervalo_saida");
  const intVolta = registros.find((r) => r.tipo === "intervalo_volta");
  const saida = registros.find((r) => r.tipo === "saida");

  if (!entrada) {
    // Sequência quebrada: tem batida posterior sem ter entrada.
    if (intSaida || intVolta || saida) {
      return { status: "sequencia_quebrada", atraso_min: 0, saida_antecipada_min: 0, exececao: true };
    }
    return { status: "falta", atraso_min: 0, saida_antecipada_min: 0, exececao: true };
  }

  // Sequência quebrada: volta de intervalo sem ter saído para intervalo.
  if (intVolta && !intSaida) {
    return { status: "sequencia_quebrada", atraso_min: 0, saida_antecipada_min: 0, exececao: true };
  }

  // Atraso na entrada.
  const dataBase = new Date(escalaDia.data + "T00:00:00");
  const [hh, mm] = (escalaDia.hora_entrada || "00:00").split(":").map(Number);
  const horaEsperada = new Date(dataBase); horaEsperada.setHours(hh, mm, 0, 0);
  const atrasoMin = Math.round((new Date(entrada.horario) - horaEsperada) / 60000);
  const atraso_min = atrasoMin > 0 ? atrasoMin : 0;

  // Em intervalo: saiu para intervalo mas ainda não voltou.
  if (intSaida && !intVolta && !saida) {
    return { status: "em_intervalo", atraso_min, saida_antecipada_min: 0, exececao: false };
  }

  // Ainda sem saída final (dia em andamento ou esqueceu de bater).
  if (!saida) {
    // incompleto: saiu pro intervalo, voltou, mas nunca registrou saída final.
    const status = (intSaida && intVolta) ? "incompleto" : "sem_saida";
    return { status, atraso_min, saida_antecipada_min: 0, exececao: true };
  }

  // Saída registrada — verifica saída antecipada vs escala.
  let saida_antecipada_min = 0;
  if (escalaDia.hora_saida) {
    const [sh, sm] = escalaDia.hora_saida.split(":").map(Number);
    const horaSaidaEsperada = new Date(dataBase); horaSaidaEsperada.setHours(sh, sm, 0, 0);
    const diffSaida = Math.round((horaSaidaEsperada - new Date(saida.horario)) / 60000);
    if (diffSaida > 5) saida_antecipada_min = diffSaida;
  }
  if (saida_antecipada_min > 0) {
    return { status: "saida_antecipada", atraso_min, saida_antecipada_min, exececao: true };
  }

  return { status: atraso_min > 5 ? "atraso" : "encerrado", atraso_min, saida_antecipada_min: 0, exececao: atraso_min > 5 };
}

/** Rótulo legível para cada status de diagnóstico. */
export const LABEL_STATUS_DIA = {
  ok: "OK",
  encerrado: "Encerrado",
  presente: "Presente",
  em_intervalo: "Em intervalo",
  sem_saida: "Sem saída",
  incompleto: "Ponto incompleto",
  atraso: "Atrasado",
  falta: "Ausente",
  saida_antecipada: "Saída antecipada",
  sequencia_quebrada: "Sequência quebrada",
  sem_jornada: "Sem jornada",
};

/**
 * Reduz o diagnóstico a uma "categoria de filtro" usada no Ponto do Dia.
 * presente = dia em andamento ou encerrado sem exceção grave.
 */
export function categoriaPonto(diag) {
  switch (diag.status) {
    case "falta": return "ausente";
    case "atraso": return "atrasado";
    case "em_intervalo": return "em_intervalo";
    case "sem_saida":
    case "incompleto": return "sem_saida";
    case "encerrado": return "encerrado";
    case "sem_jornada": return "sem_jornada";
    case "saida_antecipada":
    case "sequencia_quebrada": return "presente";
    default: return "presente";
  }
}

/** Auditoria de aprovação. */
export async function logAprovacao({ entidade, entidade_id, acao, observacoes, snapshot_antes, snapshot_depois }) {
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  await base44.entities.AuditoriaAprovacao.create({
    entidade,
    entidade_id,
    acao,
    usuario_email,
    data: new Date().toISOString(),
    observacoes,
    snapshot_antes,
    snapshot_depois,
  });
}

/** Cria notificação simples. */
export async function notificar({ destinatario_email, tipo = "outro", titulo, mensagem, link, origem_tipo, origem_id }) {
  if (!destinatario_email || !titulo) return;
  await base44.entities.Notificacao.create({
    destinatario_email, tipo, titulo, mensagem, link, origem_tipo, origem_id,
  });
}