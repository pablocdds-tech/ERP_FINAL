import { base44 } from "@/api/base44Client";

// Entidades consideradas críticas — não podem ser excluídas definitivamente,
// só desativadas/canceladas via UI. A função podeExcluir é informativa.
export const ENTIDADES_CRITICAS = [
  "ContaPagar", "ContaReceber", "FechamentoDiario", "MovimentacaoBancaria",
  "BaixaFinanceira", "LancamentoInterno", "NotaFiscal", "Reembolso",
  "OrdemProducao", "Inventario", "AjustePerda",
];

export const podeExcluir = (entidade) => !ENTIDADES_CRITICAS.includes(entidade);

// Calcula campos alterados entre old e new
function diffCampos(antes, depois) {
  if (!antes || !depois) return [];
  const keys = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  const out = [];
  keys.forEach((k) => {
    if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) out.push(k);
  });
  return out;
}

const trunc = (obj) => {
  try { return JSON.stringify(obj).slice(0, 4000); } catch { return ""; }
};

/**
 * Registra um log de auditoria.
 * @param {object} p
 * @param {string} p.modulo - cadastros, financeiro, rh, etc.
 * @param {string} p.acao - criar, atualizar, excluir, aprovar...
 * @param {string} [p.entidade]
 * @param {string} [p.entidade_id]
 * @param {string} [p.descricao]
 * @param {object} [p.valor_anterior]
 * @param {object} [p.valor_novo]
 * @param {boolean} [p.critico]
 * @param {string} [p.justificativa]
 * @param {string} [p.origem] - humano | ia | sistema | integracao
 * @param {string} [p.agent_chave]
 * @param {string} [p.status]
 * @param {string} [p.loja_id]
 */
export async function registrarLog(p) {
  let user = null;
  try { user = await base44.auth.me(); } catch { /* ignore */ }
  const campos = diffCampos(p.valor_anterior, p.valor_novo);
  const data = {
    data_hora: new Date().toISOString(),
    usuario_email: user?.email,
    usuario_nome: user?.full_name,
    origem: p.origem || "humano",
    agent_chave: p.agent_chave,
    modulo: p.modulo || "outro",
    acao: p.acao || "outro",
    entidade: p.entidade,
    entidade_id: p.entidade_id,
    descricao: p.descricao,
    valor_anterior: p.valor_anterior ? trunc(p.valor_anterior) : undefined,
    valor_novo: p.valor_novo ? trunc(p.valor_novo) : undefined,
    campos_alterados: campos,
    status: p.status || "sucesso",
    critico: !!p.critico,
    justificativa: p.justificativa,
    loja_id: p.loja_id,
  };
  return base44.entities.LogAuditoria.create(data);
}

// Atalhos
export const logCriar = (args) => registrarLog({ ...args, acao: "criar" });
export const logAtualizar = (args) => registrarLog({ ...args, acao: "atualizar" });
export const logExcluir = (args) => registrarLog({ ...args, acao: "excluir", critico: true });
export const logAprovar = (args) => registrarLog({ ...args, acao: "aprovar", critico: true });