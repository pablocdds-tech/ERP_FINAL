// =====================================================================
// Utilitários de formatação centrais (fonte única do sistema).
// Use estes helpers em vez de redefinir Intl.NumberFormat/toLocaleString
// em cada serviço ou tela.
// =====================================================================

/** Formata um número como moeda brasileira (R$). */
export const fmtMoeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Formata um número com casas decimais fixas (pt-BR). */
export const fmtNumero = (v, casas = 2) =>
  Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Formata uma data ISO para dd/mm/aaaa (pt-BR). Retorna "" se vazio. */
export const fmtData = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
};

/** Formata uma data/hora ISO para dd/mm/aaaa hh:mm (pt-BR). Retorna "" se vazio. */
export const fmtDataHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};