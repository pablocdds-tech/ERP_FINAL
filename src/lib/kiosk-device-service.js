import { base44 } from "@/api/base44Client";
import { registrarLog } from "./auditoria-service";

const LS_DEVICE_ID = "kiosk_device_id";

/** Gera/retorna o device_id local do tablet (persistido em localStorage). */
export function obterOuGerarDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(LS_DEVICE_ID);
  if (!id) {
    id = "kiosk_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(LS_DEVICE_ID, id);
  }
  return id;
}

export function limparDeviceIdLocal() {
  if (typeof window !== "undefined") localStorage.removeItem(LS_DEVICE_ID);
}

/** Busca o KioskDevice atual, se cadastrado. */
export async function obterDispositivoAtual() {
  const device_id = obterOuGerarDeviceId();
  if (!device_id) return null;
  const lista = await base44.entities.KioskDevice.filter({ device_id });
  return lista[0] || null;
}

/** Cria solicitação de registro do dispositivo (não autorizado por padrão). */
export async function solicitarRegistroDispositivo({ loja_id, nome_dispositivo }) {
  const device_id = obterOuGerarDeviceId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const existente = await obterDispositivoAtual();
  if (existente) {
    await base44.entities.KioskDevice.update(existente.id, {
      loja_id, nome_dispositivo, user_agent: ua, ativo: true,
    });
    return existente;
  }
  const novo = await base44.entities.KioskDevice.create({
    device_id, loja_id, nome_dispositivo, user_agent: ua, ativo: true, autorizado: false,
  });
  return novo;
}

/** Autoriza dispositivo (admin/gestor no ERP). */
export async function autorizarDispositivo(id, usuario_email) {
  const before = (await base44.entities.KioskDevice.filter({ id }))[0];
  await base44.entities.KioskDevice.update(id, {
    autorizado: true, ativo: true, criado_por: usuario_email,
  });
  try {
    await registrarLog({
      modulo: "rh", acao: "autorizar", entidade: "KioskDevice", entidade_id: id,
      descricao: `Kiosk autorizado: ${before?.nome_dispositivo || before?.device_id}`,
      origem: "humano", valor_anterior: { autorizado: before?.autorizado },
      valor_novo: { autorizado: true }, loja_id: before?.loja_id, critico: true,
    });
  } catch { /* */ }
}

/** Revoga dispositivo. */
export async function revogarDispositivo(id) {
  const before = (await base44.entities.KioskDevice.filter({ id }))[0];
  await base44.entities.KioskDevice.update(id, { autorizado: false, ativo: false });
  try {
    await registrarLog({
      modulo: "rh", acao: "revogar", entidade: "KioskDevice", entidade_id: id,
      descricao: `Kiosk revogado: ${before?.nome_dispositivo || before?.device_id}`,
      origem: "humano", valor_anterior: { autorizado: before?.autorizado },
      valor_novo: { autorizado: false, ativo: false }, loja_id: before?.loja_id, critico: true,
    });
  } catch { /* */ }
}

/** Atualiza último acesso (chamada do KioskGuard). */
export async function pingAcesso(device) {
  if (!device?.id) return;
  await base44.entities.KioskDevice.update(device.id, {
    ultimo_acesso_em: new Date().toISOString(),
  });
}