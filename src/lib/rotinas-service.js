import { base44 } from "@/api/base44Client";

// ---------- COMENTÁRIOS ----------
export async function listarComentarios(entidade, entidade_id) {
  if (!entidade_id) return [];
  return base44.entities.ComentarioOperacional.filter({ entidade, entidade_id }, "created_date", 200);
}

export async function adicionarComentario({ entidade, entidade_id, texto, fotos = [], tipo = "comentario" }) {
  let autor_email = null, autor_nome = null;
  try {
    const me = await base44.auth.me();
    autor_email = me?.email; autor_nome = me?.full_name;
  } catch { /* */ }
  return base44.entities.ComentarioOperacional.create({
    entidade, entidade_id, texto, fotos, tipo, autor_email, autor_nome,
  });
}

// ---------- CHAMADO → TAREFA / OS ----------
export async function chamadoParaTarefa({ chamado, responsavel_id, prazo, prioridade }) {
  const tarefa = await base44.entities.Tarefa.create({
    titulo: chamado.titulo,
    descricao: chamado.descricao || "",
    loja_id: chamado.loja_id,
    responsavel_id,
    data_limite: prazo,
    prioridade: prioridade || (chamado.prioridade === "critica" ? "alta" : chamado.prioridade) || "media",
    status: "pendente",
    origem_tipo: "chamado",
    origem_id: chamado.id,
  });
  await base44.entities.Chamado.update(chamado.id, { tarefa_id: tarefa.id, status: "em_atendimento" });
  await adicionarComentario({
    entidade: "Chamado", entidade_id: chamado.id, tipo: "sistema",
    texto: `Chamado convertido em tarefa #${tarefa.id.slice(-6)}.`,
  });
  return tarefa;
}

export async function chamadoParaOS({ chamado, equipamento_id, fornecedor_id, responsavel_id, data_prevista, custo_previsto }) {
  const os = await base44.entities.OrdemServico.create({
    titulo: chamado.titulo,
    descricao: chamado.descricao || "",
    loja_id: chamado.loja_id,
    equipamento_id,
    tipo: "corretiva",
    origem_tipo: "chamado",
    origem_id: chamado.id,
    fornecedor_id,
    responsavel_id,
    data_abertura: new Date().toISOString().slice(0, 10),
    data_prevista,
    custo_previsto: custo_previsto || 0,
    prioridade: chamado.prioridade || "media",
    status: "aberta",
    fotos_antes: chamado.fotos || [],
  });
  await base44.entities.Chamado.update(chamado.id, { ordem_servico_id: os.id, status: "em_atendimento" });
  await adicionarComentario({
    entidade: "Chamado", entidade_id: chamado.id, tipo: "sistema",
    texto: `Chamado convertido em OS #${os.id.slice(-6)}.`,
  });
  return os;
}

// ---------- OCORRÊNCIA ----------
export async function criarOcorrencia(payload) {
  let autor_email = null;
  try { autor_email = (await base44.auth.me())?.email; } catch { /* */ }
  return base44.entities.OcorrenciaOperacional.create({
    status: "aberta",
    severidade: "media",
    tipo: "operacional",
    origem_tipo: "manual",
    abertura_colaborador_id: autor_email || undefined,
    ...payload,
  });
}

export async function ocorrenciaParaTarefa({ ocorrencia, responsavel_id, prazo }) {
  const tarefa = await base44.entities.Tarefa.create({
    titulo: ocorrencia.titulo,
    descricao: ocorrencia.descricao || "",
    loja_id: ocorrencia.loja_id,
    responsavel_id,
    data_limite: prazo,
    prioridade: ocorrencia.severidade === "critica" ? "alta" : "media",
    status: "pendente",
    origem_tipo: "ocorrencia",
    origem_id: ocorrencia.id,
  });
  await base44.entities.OcorrenciaOperacional.update(ocorrencia.id, {
    tarefa_id: tarefa.id, status: "em_andamento", responsavel_id,
  });
  return tarefa;
}

// Gera ocorrências automaticamente para itens não conformes do checklist
export async function gerarOcorrenciasDeChecklist({ execucao, checklist }) {
  const naoConformes = (execucao.respostas || []).filter((r) => r.feito === false);
  if (naoConformes.length === 0) return [];
  const criadas = [];
  for (const r of naoConformes) {
    const oc = await criarOcorrencia({
      titulo: `Não conformidade: ${r.texto || "item"}`,
      descricao: r.observacao || `Item do checklist "${checklist?.titulo || ""}" marcado como não conforme.`,
      loja_id: execucao.loja_id,
      tipo: "qualidade",
      severidade: "media",
      origem_tipo: "checklist",
      origem_id: execucao.id,
      fotos: r.foto_url ? [r.foto_url] : [],
    });
    criadas.push(oc);
  }
  return criadas;
}

// ---------- ORDEM DE SERVIÇO ----------
export async function concluirOS({ os, custo_real, laudo, fotos_depois, conta_pagar = false }) {
  const updates = {
    status: "concluida",
    data_conclusao: new Date().toISOString().slice(0, 10),
    custo_real: custo_real ?? os.custo_previsto ?? 0,
    laudo,
    fotos_depois: fotos_depois || os.fotos_depois || [],
  };

  // Atualiza última manutenção do equipamento
  if (os.equipamento_id) {
    await base44.entities.Equipamento.update(os.equipamento_id, {
      ultima_manutencao: updates.data_conclusao,
    });
  }

  // Gera conta a pagar (custo futuro) se solicitado e houver fornecedor
  if (conta_pagar && os.fornecedor_id && updates.custo_real > 0) {
    const venc = new Date(); venc.setDate(venc.getDate() + 7);
    const cp = await base44.entities.ContaPagar.create({
      descricao: `OS ${os.titulo}`,
      fornecedor_id: os.fornecedor_id,
      loja_id: os.loja_id,
      valor: updates.custo_real,
      data_vencimento: venc.toISOString().slice(0, 10),
      data_emissao: updates.data_conclusao,
      status: "aberta",
      origem_tipo: "ordem_servico",
      origem_id: os.id,
    });
    updates.conta_pagar_id = cp.id;
  }

  return base44.entities.OrdemServico.update(os.id, updates);
}

// ---------- PLANO DE MANUTENÇÃO ----------
const FREQ_DIAS = {
  semanal: 7, quinzenal: 15, mensal: 30, bimestral: 60,
  trimestral: 90, semestral: 180, anual: 365,
};

export function calcularProximaExecucao(plano, base = new Date()) {
  const dias = plano.intervalo_dias || FREQ_DIAS[plano.frequencia] || 30;
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function gerarOSDePlano(plano) {
  const os = await base44.entities.OrdemServico.create({
    titulo: plano.nome,
    descricao: plano.instrucoes || "",
    loja_id: plano.loja_id,
    equipamento_id: plano.equipamento_id,
    tipo: "preventiva",
    origem_tipo: "plano_manutencao",
    origem_id: plano.id,
    fornecedor_id: plano.fornecedor_id,
    responsavel_id: plano.responsavel_id,
    data_abertura: new Date().toISOString().slice(0, 10),
    data_prevista: plano.proxima_execucao,
    custo_previsto: plano.custo_estimado || 0,
    prioridade: "media",
    status: "agendada",
  });
  const proxima = calcularProximaExecucao(plano);
  await base44.entities.ManutencaoPlano.update(plano.id, {
    ultima_execucao: new Date().toISOString().slice(0, 10),
    proxima_execucao: proxima,
  });
  return os;
}