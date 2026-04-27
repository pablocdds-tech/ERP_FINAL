import { base44 } from "@/api/base44Client";
import { proximoEventoPonto } from "./rh-service";
import { registrarLog } from "./auditoria-service";

/**
 * Faz upload de um Blob como arquivo (jpg).
 */
export async function uploadFotoBlob(blob, name = "selfie.jpg") {
  const file = new File([blob], name, { type: blob.type || "image/jpeg" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Registra batida de ponto com selfie + valida via Gemini.
 * Retorna { registro, ia }.
 */
export async function registrarBatida({ colaborador, tipo, selfie_url, origem = "pwa", dispositivo, fallback_pin = false, lat, lng }) {
  if (!colaborador?.id || !tipo) throw new Error("Dados insuficientes");

  // Chama validação IA (não bloqueia em caso de falha — vira pendente)
  let ia = null;
  try {
    const res = await base44.functions.invoke("validarPontoFacial", {
      colaborador_id: colaborador.id,
      selfie_url,
    });
    ia = res?.data || null;
  } catch (e) {
    ia = { resultado: "precisa_revisao", confianca: 0, motivo: "Falha ao validar com IA" };
  }

  // Determina status final
  let status = "registrado";
  if (fallback_pin) {
    status = "pendente_revisao";
  } else if (ia?.resultado === "reprovado") {
    status = "rejeitado";
  } else if (ia?.resultado === "baixa_confianca" || ia?.resultado === "precisa_revisao") {
    status = "pendente_revisao";
  } else if (ia?.resultado === "aprovado") {
    status = "registrado";
  } else {
    status = "pendente_revisao";
  }

  const agora = new Date();
  const registro = await base44.entities.RegistroPonto.create({
    colaborador_id: colaborador.id,
    loja_id: colaborador.loja_id,
    data: agora.toISOString().slice(0, 10),
    tipo,
    horario: agora.toISOString(),
    latitude: lat,
    longitude: lng,
    selfie_url,
    origem,
    dispositivo,
    fallback_pin,
    status,
    ia_resultado: ia?.resultado || "nao_avaliado",
    ia_confianca: ia?.confianca ?? null,
    ia_motivo: ia?.motivo || "",
    ia_detalhes: ia ? JSON.stringify(ia) : "",
  });

  // Auditoria
  try {
    await registrarLog({
      modulo: "rh",
      acao: "criar",
      entidade: "RegistroPonto",
      entidade_id: registro.id,
      descricao: `Ponto ${tipo} de ${colaborador.nome} (${status})${fallback_pin ? " · PIN" : ""}`,
      origem: "humano",
      valor_novo: registro,
      loja_id: colaborador.loja_id,
      critico: status === "pendente_revisao" || status === "rejeitado",
    });
  } catch { /* auditoria nunca bloqueia */ }

  return { registro, ia };
}

/**
 * Próximo evento (entrada/intervalo/saída) para o colaborador hoje.
 */
export async function obterProximoEvento(colaborador_id) {
  const hoje = new Date().toISOString().slice(0, 10);
  const list = await base44.entities.RegistroPonto.filter(
    { colaborador_id, data: hoje },
    "horario"
  );
  const ativos = list.filter((r) => r.status !== "rejeitado");
  return { proximo: proximoEventoPonto(ativos), registros: ativos };
}

/**
 * Cadastra/atualiza fotos faciais do colaborador.
 * Marca status como "cadastrada" quando ao menos a frontal existe.
 */
export async function salvarCadastroFacial(colaborador_id, { frontal_url, esquerda_url, direita_url }) {
  let usuario = null;
  try { usuario = (await base44.auth.me())?.email; } catch { /* */ }

  const before = await base44.entities.Colaborador.filter({ id: colaborador_id });
  const antes = before[0];

  const update = {
    facial_frontal_url: frontal_url ?? antes?.facial_frontal_url,
    facial_esquerda_url: esquerda_url ?? antes?.facial_esquerda_url,
    facial_direita_url: direita_url ?? antes?.facial_direita_url,
    facial_status: "cadastrada",
    facial_cadastrada_em: new Date().toISOString(),
    facial_cadastrada_por: usuario,
  };
  await base44.entities.Colaborador.update(colaborador_id, update);

  try {
    await registrarLog({
      modulo: "rh",
      acao: "atualizar",
      entidade: "Colaborador",
      entidade_id: colaborador_id,
      descricao: `Cadastro facial de ${antes?.nome || colaborador_id}`,
      origem: "humano",
      valor_anterior: { facial_status: antes?.facial_status },
      valor_novo: update,
      loja_id: antes?.loja_id,
      critico: false,
    });
  } catch { /* */ }
}

/**
 * Aprovar manualmente um RegistroPonto pendente.
 */
export async function aprovarRegistroPontoManual(registro, observacao = "") {
  let usuario = null;
  try { usuario = (await base44.auth.me())?.email; } catch { /* */ }
  await base44.entities.RegistroPonto.update(registro.id, {
    status: "aprovado",
    aprovado_por: usuario,
    aprovado_em: new Date().toISOString(),
    observacoes: observacao || registro.observacoes,
  });
  try {
    await registrarLog({
      modulo: "rh",
      acao: "aprovar",
      entidade: "RegistroPonto",
      entidade_id: registro.id,
      descricao: `Ponto aprovado manualmente`,
      origem: "humano",
      justificativa: observacao,
      valor_anterior: { status: registro.status },
      valor_novo: { status: "aprovado" },
      loja_id: registro.loja_id,
      critico: true,
    });
  } catch { /* */ }
}

export async function rejeitarRegistroPontoManual(registro, motivo) {
  let usuario = null;
  try { usuario = (await base44.auth.me())?.email; } catch { /* */ }
  await base44.entities.RegistroPonto.update(registro.id, {
    status: "rejeitado",
    aprovado_por: usuario,
    aprovado_em: new Date().toISOString(),
    observacoes: motivo,
  });
  try {
    await registrarLog({
      modulo: "rh",
      acao: "rejeitar",
      entidade: "RegistroPonto",
      entidade_id: registro.id,
      descricao: `Ponto rejeitado: ${motivo}`,
      origem: "humano",
      justificativa: motivo,
      valor_anterior: { status: registro.status },
      valor_novo: { status: "rejeitado" },
      loja_id: registro.loja_id,
      critico: true,
    });
  } catch { /* */ }
}

/**
 * Identifica colaborador por PIN (fallback do Kiosk).
 */
export async function buscarPorPin(pin, loja_id) {
  if (!pin) return null;
  const filtros = { pin_ponto: pin, status: "ativo" };
  if (loja_id) filtros.loja_id = loja_id;
  const list = await base44.entities.Colaborador.filter(filtros);
  return list[0] || null;
}