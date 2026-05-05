/**
 * Validação de Colaborador antes de salvar.
 * Combina regras de Nome + CPF (cpf-validator) com checagem de unicidade
 * contra a base. Usado no ColaboradorDialog e em qualquer fluxo de
 * importação/edição.
 */

import { base44 } from "@/api/base44Client";
import {
  isCpfValido,
  isNomeCompletoValido,
  limparCpf,
  MSG_CPF_INVALIDO,
  MSG_NOME_INVALIDO,
  MSG_CPF_DUPLICADO,
} from "./cpf-validator";
import { registrarLog } from "./auditoria-service";

/**
 * Verifica unicidade de CPF entre colaboradores ATIVOS.
 * Se houver desligado com mesmo CPF, retorna sugestão de reativação.
 *
 * @param {string} cpfDigitos - CPF apenas com dígitos
 * @param {string?} ignorarId - id do próprio colaborador em edição (não conta como duplicidade)
 * @returns {{ duplicadoAtivo: object|null, desligadoMesmoCpf: object|null }}
 */
export async function checarUnicidadeCpf(cpfDigitos, ignorarId = null) {
  if (!cpfDigitos) return { duplicadoAtivo: null, desligadoMesmoCpf: null };
  // Filtra por CPF — note que pode ter sido salvo formatado em registros antigos.
  // Para garantir, buscamos por igualdade de CPF "cru" comparando em memória.
  const candidatos = await base44.entities.Colaborador.filter({}, "-created_date", 2000);
  const mesmoCpf = candidatos.filter(
    (c) => limparCpf(c.cpf) === cpfDigitos && c.id !== ignorarId
  );
  const duplicadoAtivo = mesmoCpf.find((c) => c.status !== "desligado") || null;
  const desligadoMesmoCpf = mesmoCpf.find((c) => c.status === "desligado") || null;
  return { duplicadoAtivo, desligadoMesmoCpf };
}

/**
 * Valida campos obrigatórios + unicidade. Retorna `{ ok, erros, cpfDigitos }`.
 * Em caso de erro, registra log de auditoria de tentativa.
 *
 * @param {object} data - dados do colaborador (form)
 * @param {string?} ignorarId - id do colaborador em edição
 */
export async function validarColaboradorParaSalvar(data, ignorarId = null) {
  const erros = {};
  const cpfDigitos = limparCpf(data.cpf);

  if (!isNomeCompletoValido(data.nome)) {
    erros.nome = MSG_NOME_INVALIDO;
  }
  if (!cpfDigitos || !isCpfValido(cpfDigitos)) {
    erros.cpf = MSG_CPF_INVALIDO;
  }
  if (!data.loja_id) {
    erros.loja_id = "Informe a loja principal.";
  }

  // Se nome/CPF básicos passaram, verifica unicidade
  let sugestaoReativar = null;
  if (!erros.cpf) {
    const { duplicadoAtivo, desligadoMesmoCpf } = await checarUnicidadeCpf(cpfDigitos, ignorarId);
    if (duplicadoAtivo) {
      erros.cpf = MSG_CPF_DUPLICADO;
    } else if (desligadoMesmoCpf) {
      sugestaoReativar = desligadoMesmoCpf;
    }
  }

  if (Object.keys(erros).length > 0) {
    try {
      await registrarLog({
        modulo: "rh",
        acao: "bloquear",
        entidade: "Colaborador",
        entidade_id: ignorarId || undefined,
        descricao: `Tentativa de salvar colaborador com dados inválidos: ${Object.keys(erros).join(", ")}`,
        origem: "humano",
        valor_novo: { nome: data.nome, cpf_mascara: data.cpf ? "***" : "", erros },
        critico: true,
      });
    } catch { /* nunca bloqueia */ }
    return { ok: false, erros, cpfDigitos, sugestaoReativar };
  }

  return { ok: true, erros: {}, cpfDigitos, sugestaoReativar };
}