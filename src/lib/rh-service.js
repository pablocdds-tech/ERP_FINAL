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

/** Compara escala vs registros para detectar atraso e falta. */
export function diagnosticoDia(escalaDia, registros) {
  if (!escalaDia || escalaDia.tipo !== "normal") return { status: "sem_jornada", atraso_min: 0 };
  const entrada = registros.find((r) => r.tipo === "entrada");
  if (!entrada) return { status: "falta", atraso_min: 0 };
  const [hh, mm] = (escalaDia.hora_entrada || "00:00").split(":").map(Number);
  const dataBase = new Date(escalaDia.data + "T00:00:00");
  const horaEsperada = new Date(dataBase);
  horaEsperada.setHours(hh, mm, 0, 0);
  const diffMin = Math.round((new Date(entrada.horario) - horaEsperada) / 60000);
  return {
    status: diffMin > 5 ? "atraso" : "ok",
    atraso_min: diffMin > 0 ? diffMin : 0,
  };
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