/**
 * Pré-checagem de pendências cadastrais antes da exportação AFD oficial
 * e do fechamento mensal de ponto.
 *
 * Garante que TODOS os colaboradores com batidas no período tenham:
 *  - nome completo válido
 *  - CPF válido pelo algoritmo oficial
 *
 * Uso:
 *  const r = await verificarPendenciasCadastraisPeriodo({ dataInicio, dataFim, loja_id, filtro_loja });
 *  if (!r.ok) → bloquear export oficial / fechamento e exibir r.pendencias.
 */

import { base44 } from "@/api/base44Client";
import { isCpfValido, isNomeCompletoValido, limparCpf } from "./cpf-validator";

/**
 * @param {object} params
 * @param {string} params.dataInicio - "YYYY-MM-DD"
 * @param {string} params.dataFim - "YYYY-MM-DD"
 * @param {string?} params.loja_id - filtra colaboradores que bateram nessa loja (ou principal, conforme filtro_loja)
 * @param {"batida"|"principal"} [params.filtro_loja="batida"]
 * @returns {Promise<{
 *   ok: boolean,
 *   total_colaboradores: number,
 *   pendencias: Array<{colaborador_id: string, nome: string, loja: string, problemas: string[]}>
 * }>}
 */
export async function verificarPendenciasCadastraisPeriodo({
  dataInicio, dataFim, loja_id = null, filtro_loja = "batida",
}) {
  const todos = await base44.entities.RegistroPonto.filter({}, "-data", 50000);
  const registros = todos.filter((r) => {
    if (r.status === "rejeitado") return false;
    if (dataInicio && r.data < dataInicio) return false;
    if (dataFim && r.data > dataFim) return false;
    if (loja_id) {
      const lojaBatida = r.loja_batida_id || r.loja_id;
      const lojaPrincipal = r.loja_colaborador_id;
      if (filtro_loja === "principal") {
        if (lojaPrincipal !== loja_id) return false;
      } else {
        if (lojaBatida !== loja_id) return false;
      }
    }
    return true;
  });

  const colabIds = [...new Set(registros.map((r) => r.colaborador_id))];
  if (colabIds.length === 0) {
    return { ok: true, total_colaboradores: 0, pendencias: [] };
  }
  const colabs = await base44.entities.Colaborador.filter({ id: { $in: colabIds } });
  const lojas = await base44.entities.Loja.list();
  const lojaMap = Object.fromEntries(lojas.map((l) => [l.id, l.nome]));

  const pendencias = [];
  for (const c of colabs) {
    const problemas = [];
    if (!isNomeCompletoValido(c.nome)) problemas.push("Nome ausente ou incompleto");
    const cpfDigitos = limparCpf(c.cpf);
    if (!cpfDigitos) problemas.push("CPF ausente");
    else if (!isCpfValido(cpfDigitos)) problemas.push("CPF inválido");
    if (problemas.length > 0) {
      pendencias.push({
        colaborador_id: c.id,
        nome: c.nome || "(sem nome)",
        loja: lojaMap[c.loja_id] || "—",
        problemas,
      });
    }
  }

  return {
    ok: pendencias.length === 0,
    total_colaboradores: colabs.length,
    pendencias,
  };
}