/**
 * Validação oficial de CPF (algoritmo dos dígitos verificadores).
 * Centraliza toda a lógica de CPF para uso em formulários, importações,
 * exportação AFD e fechamento mensal.
 */

/** Remove tudo que não é dígito. */
export function limparCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

/** Aplica máscara visual 000.000.000-00. Aceita parcial durante digitação. */
export function formatarCpf(cpf) {
  const d = limparCpf(cpf).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Valida CPF pelo algoritmo oficial dos dígitos verificadores.
 * Bloqueia também sequências repetidas (000…, 111…) e padrões inválidos.
 */
export function isCpfValido(cpf) {
  const d = limparCpf(cpf);
  if (d.length !== 11) return false;
  // Sequências repetidas (00000000000, 11111111111, ...)
  if (/^(\d)\1{10}$/.test(d)) return false;

  const calcDV = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (base.length + 1 - i);
    }
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };

  const dv1 = calcDV(d.slice(0, 9));
  if (dv1 !== parseInt(d[9], 10)) return false;
  const dv2 = calcDV(d.slice(0, 10));
  if (dv2 !== parseInt(d[10], 10)) return false;
  return true;
}

/** Mensagem padronizada de erro de CPF. */
export const MSG_CPF_INVALIDO = "Informe um CPF válido para o colaborador.";
/** Mensagem padronizada de erro de Nome. */
export const MSG_NOME_INVALIDO = "Informe o nome completo do colaborador.";
/** Mensagem de unicidade. */
export const MSG_CPF_DUPLICADO = "Já existe colaborador cadastrado com este CPF.";

/**
 * Valida nome completo:
 * - obrigatório (não vazio, não só espaços)
 * - pelo menos 2 palavras
 */
export function isNomeCompletoValido(nome) {
  const limpo = String(nome || "").trim().replace(/\s+/g, " ");
  if (!limpo) return false;
  const partes = limpo.split(" ").filter((p) => p.length >= 2);
  return partes.length >= 2;
}