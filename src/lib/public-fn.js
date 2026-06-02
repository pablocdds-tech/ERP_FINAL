import { appParams } from "@/lib/app-params";

/**
 * Chama o endpoint HTTP PÚBLICO de uma função backend, SEM token de auth.
 * Necessário para páginas públicas (ex: autocadastro facial) em apps privados:
 * o SDK anexaria contexto de auth e o backend rejeitaria com auth_required.
 */
export async function invokePublicFunction(name, payload = {}) {
  const base = appParams.appBaseUrl || window.location.origin;
  const url = `${String(base).replace(/\/$/, "")}/functions/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch { /* */ }
  return { data, status: res.status };
}