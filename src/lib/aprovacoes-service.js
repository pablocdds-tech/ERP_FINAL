import { base44 } from "@/api/base44Client";
import { logAprovacao, notificar } from "./rh-service";

/** Aprova nota fiscal pendente: cria NotaFiscal definitiva e marca pendente como aprovada. */
export async function aprovarNotaFiscalPendente(pendente, observacoes = "") {
  // Tenta achar/Criar fornecedor por CNPJ
  let fornecedor_id = null;
  if (pendente.fornecedor_cnpj) {
    const f = await base44.entities.Fornecedor.filter({ cnpj_cpf: pendente.fornecedor_cnpj });
    if (f[0]) fornecedor_id = f[0].id;
    else {
      const novo = await base44.entities.Fornecedor.create({
        nome: pendente.fornecedor_nome || pendente.fornecedor_cnpj,
        cnpj_cpf: pendente.fornecedor_cnpj,
      });
      fornecedor_id = novo.id;
    }
  }
  const nf = await base44.entities.NotaFiscal.create({
    numero: pendente.numero,
    serie: pendente.serie,
    fornecedor_id,
    loja_id: pendente.loja_id,
    data_emissao: pendente.data_emissao,
    data_entrada: new Date().toISOString().slice(0, 10),
    valor_total: pendente.valor_total,
    chave_acesso: pendente.chave_acesso,
    arquivo_url: pendente.arquivo_url,
    observacoes: `Importada via ${pendente.origem}. ${observacoes || ""}`.trim(),
    status: "recebida",
  });
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  const updated = await base44.entities.NotaFiscalPendente.update(pendente.id, {
    status: "aprovada",
    nota_fiscal_id: nf.id,
    aprovado_por: usuario_email,
    aprovado_em: new Date().toISOString(),
    observacoes_aprovacao: observacoes,
  });
  await logAprovacao({
    entidade: "NotaFiscalPendente",
    entidade_id: pendente.id,
    acao: "aprovar",
    observacoes,
    snapshot_antes: pendente,
    snapshot_depois: updated,
  });
  return nf;
}

export async function rejeitarNotaFiscalPendente(pendente, motivo = "") {
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  const updated = await base44.entities.NotaFiscalPendente.update(pendente.id, {
    status: "rejeitada",
    aprovado_por: usuario_email,
    aprovado_em: new Date().toISOString(),
    observacoes_aprovacao: motivo,
  });
  await logAprovacao({
    entidade: "NotaFiscalPendente", entidade_id: pendente.id, acao: "rejeitar",
    observacoes: motivo, snapshot_antes: pendente, snapshot_depois: updated,
  });
}

/** Aprova fechamento pendente: cria/atualiza FechamentoDiario. */
export async function aprovarFechamentoPendente(pendente, observacoes = "") {
  const total_vendas = (pendente.vendas_por_canal || []).reduce((s, v) => s + (Number(v.valor) || 0), 0);
  const total_pagamentos = (pendente.vendas_por_pagamento || []).reduce((s, v) => s + (Number(v.valor_declarado) || 0), 0);
  const fech = await base44.entities.FechamentoDiario.create({
    loja_id: pendente.loja_id,
    data: pendente.data_referencia,
    vendas_por_canal: pendente.vendas_por_canal || [],
    vendas_por_pagamento: pendente.vendas_por_pagamento || [],
    total_vendas,
    total_pagamentos_declarado: total_pagamentos,
    status: "fechado",
    observacoes: `Importado via ${pendente.origem}. ${observacoes || ""}`.trim(),
  });
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  const updated = await base44.entities.FechamentoPendente.update(pendente.id, {
    status: "aprovado",
    fechamento_diario_id: fech.id,
    aprovado_por: usuario_email,
    aprovado_em: new Date().toISOString(),
  });
  await logAprovacao({
    entidade: "FechamentoPendente", entidade_id: pendente.id, acao: "aprovar",
    observacoes, snapshot_antes: pendente, snapshot_depois: updated,
  });
  return fech;
}

export async function rejeitarFechamentoPendente(pendente, motivo = "") {
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  const updated = await base44.entities.FechamentoPendente.update(pendente.id, {
    status: "rejeitado",
    aprovado_por: usuario_email,
    aprovado_em: new Date().toISOString(),
  });
  await logAprovacao({
    entidade: "FechamentoPendente", entidade_id: pendente.id, acao: "rejeitar",
    observacoes: motivo, snapshot_antes: pendente, snapshot_depois: updated,
  });
}

/** Aprovar/rejeitar SolicitaçãoRH. */
export async function decidirSolicitacao(sol, decisao /* aprovada|rejeitada */, resposta = "") {
  let usuario_email = null;
  try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
  const updated = await base44.entities.SolicitacaoRH.update(sol.id, {
    status: decisao,
    resposta_gestor: resposta,
    aprovado_por: usuario_email,
    aprovado_em: new Date().toISOString(),
  });
  await logAprovacao({
    entidade: "SolicitacaoRH", entidade_id: sol.id,
    acao: decisao === "aprovada" ? "aprovar" : "rejeitar",
    observacoes: resposta, snapshot_antes: sol, snapshot_depois: updated,
  });
  // Notifica colaborador
  try {
    const col = await base44.entities.Colaborador.filter({ id: sol.colaborador_id });
    if (col[0]?.email) {
      await notificar({
        destinatario_email: col[0].email,
        tipo: "solicitacao",
        titulo: `Sua solicitação foi ${decisao}`,
        mensagem: resposta || sol.tipo,
        link: "/pwa/solicitacoes",
        origem_tipo: "SolicitacaoRH",
        origem_id: sol.id,
      });
    }
  } catch { /* */ }
}