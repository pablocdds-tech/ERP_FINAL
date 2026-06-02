/**
 * Detecção de pendências impeditivas para o Fechamento Mensal de Ponto.
 *
 * Recebe a prévia (saída de previaFechamento) e cruza com:
 *  - SolicitacaoRH pendentes no período (justificativas/abonos não decididos)
 *  - integridade cadastral do colaborador (CPF válido, loja, jornada)
 *  - faltas sem justificativa e dias sem jornada
 *
 * Função de leitura: NÃO altera nada. Apenas classifica.
 */
import { base44 } from "@/api/base44Client";
import { isCpfValido } from "@/lib/cpf-validator";

const STATUS_PENDENTE_PONTO = ["falta", "sem_jornada"];

/**
 * @param {object} previa  saída de previaFechamento ({ data_inicio, data_fim, linhas })
 * @returns {Promise<{ bloqueios: Array, total: number, porColaborador: object }>}
 */
export async function detectarPendencias(previa) {
  if (!previa) return { bloqueios: [], total: 0, porColaborador: {} };
  const { data_inicio, data_fim, linhas } = previa;

  // Solicitações pendentes que cobrem o período (data_referencia dentro do mês)
  let solicitacoes = [];
  try {
    solicitacoes = await base44.entities.SolicitacaoRH.filter({ status: "pendente" });
  } catch { solicitacoes = []; }

  const pendentesPorColab = {};
  for (const s of solicitacoes) {
    const ref = s.data_referencia || s.data_solicitacao || "";
    if (ref && (ref < data_inicio || ref > data_fim)) continue;
    (pendentesPorColab[s.colaborador_id] ||= []).push(s);
  }

  const bloqueios = [];
  const porColaborador = {};

  for (const l of linhas) {
    const c = l.colaborador || {};
    const itens = [];

    // 1) Cadastro: CPF inválido
    if (!c.cpf || !isCpfValido(c.cpf)) {
      itens.push({ tipo: "cpf_invalido", label: "CPF ausente ou inválido" });
    }
    // 2) Cadastro: sem loja
    if (!c.loja_id) {
      itens.push({ tipo: "sem_loja", label: "Colaborador sem loja vinculada" });
    }
    // 3) Cadastro: sem jornada
    if (!l.jornada_id) {
      itens.push({ tipo: "sem_jornada_cad", label: "Colaborador sem jornada definida" });
    }

    // 4) Dias com pendência de ponto (falta / sem jornada no dia)
    const diasFalta = (l.resumos || []).filter((r) => r.status === "falta").map((r) => r.data);
    const diasSemJornada = (l.resumos || []).filter((r) => r.status === "sem_jornada").map((r) => r.data);

    // dias de falta que NÃO têm solicitação pendente nem aprovada cobrindo → bloqueio
    const refsPendentes = new Set((pendentesPorColab[c.id] || []).map((s) => s.data_referencia));
    const faltasSemTratativa = diasFalta.filter((d) => !refsPendentes.has(d));

    if (faltasSemTratativa.length > 0) {
      itens.push({ tipo: "falta_sem_justificativa", label: `${faltasSemTratativa.length} falta(s) sem justificativa`, dias: faltasSemTratativa });
    }
    if (diasSemJornada.length > 0) {
      itens.push({ tipo: "dia_sem_jornada", label: `${diasSemJornada.length} dia(s) trabalhado(s) sem jornada cadastrada`, dias: diasSemJornada });
    }

    // 5) Solicitações ainda pendentes de decisão no período
    const pend = pendentesPorColab[c.id] || [];
    if (pend.length > 0) {
      itens.push({ tipo: "solicitacao_pendente", label: `${pend.length} solicitação(ões) pendente(s) de decisão` });
    }

    if (itens.length > 0) {
      porColaborador[c.id] = { nome: c.nome, itens };
      bloqueios.push({ colaborador_id: c.id, nome: c.nome, itens });
    }
  }

  return {
    bloqueios,
    total: bloqueios.reduce((acc, b) => acc + b.itens.length, 0),
    porColaborador,
  };
}

export { STATUS_PENDENTE_PONTO };