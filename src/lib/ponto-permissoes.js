/**
 * Permissões de registro de ponto por canal (PWA / Kiosk).
 * Validação centralizada — usada no frontend e no serviço de registro.
 *
 * Retorna { ok: boolean, motivo?: string, codigo?: string }.
 * codigo é estável para auditoria/UI.
 */

export function podeRegistrarPonto(colaborador, origem) {
  if (!colaborador) {
    return { ok: false, codigo: "sem_colaborador", motivo: "Colaborador não identificado." };
  }

  // Status do colaborador
  if (colaborador.status === "desligado") {
    return { ok: false, codigo: "desligado", motivo: "Colaborador desligado." };
  }
  if (colaborador.status === "bloqueado" || colaborador.bloqueado_para_ponto) {
    return {
      ok: false,
      codigo: "bloqueado",
      motivo: colaborador.bloqueado_motivo || "Colaborador bloqueado para registro de ponto.",
    };
  }
  if (colaborador.status === "afastado") {
    return { ok: false, codigo: "afastado", motivo: "Colaborador afastado." };
  }

  // Origem específica
  if (origem === "pwa") {
    if (colaborador.pode_bater_ponto_pelo_pwa !== true) {
      return {
        ok: false,
        codigo: "pwa_nao_autorizado",
        motivo: "Seu ponto deve ser registrado pelo Kiosk da loja. Procure o gestor caso precise de liberação para bater pelo celular.",
      };
    }
    return { ok: true };
  }

  if (origem === "kiosk") {
    if (colaborador.pode_bater_ponto_pelo_kiosk === false) {
      return {
        ok: false,
        codigo: "kiosk_nao_autorizado",
        motivo: "Colaborador sem permissão para registrar ponto neste Kiosk.",
      };
    }
    return { ok: true };
  }

  // Origens administrativas (ajuste_gestor / manual) seguem o fluxo do gestor
  return { ok: true };
}