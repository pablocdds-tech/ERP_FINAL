// Helper único de perfil/permissão.
// Centraliza regras de acesso entre /admin (ERP) e /app (PWA).

import { isGestor as checkGestor } from "./rh-service";

// Roles do User entity podem ser strings livres; padronizamos quatro chaves:
// "admin" | "gestor" | "operador" | "funcionario"
// Se um user tem role !== admin/gestor/operador, é tratado como funcionario.

export function getPerfilChave(user) {
  const r = (user?.role || "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "gestor") return "gestor";
  if (r === "operador") return "operador";
  return "funcionario";
}

// Pode entrar no ERP (/admin)?
// admin / gestor / operador → sim. funcionario → não.
export function canAccessAdmin(user) {
  const p = getPerfilChave(user);
  return p === "admin" || p === "gestor" || p === "operador";
}

// Pode entrar no PWA (/app)?
// Todos os perfis podem usar o PWA — admin entra opcionalmente.
export function canAccessApp(user) {
  return !!user;
}

// É gestor (PWA mostra recursos de gestor)?
// Combina role do user + flag is_gestor do colaborador.
export function isGestorPwa(user, colaborador) {
  return checkGestor(user, colaborador);
}

// Para onde mandar o usuário após login?
export function defaultLandingPath(user) {
  const p = getPerfilChave(user);
  if (p === "admin" || p === "operador") return "/admin";
  // gestor e funcionario começam no PWA
  return "/app";
}