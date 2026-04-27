import { base44 } from "@/api/base44Client";
import { proximoEventoPonto } from "./rh-service";
import { registrarLog } from "./auditoria-service";
import { enfileirarBatida } from "./ponto-offline-queue";

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
 * Aceita opcionalmente { match_score, match_dist } da comparação biométrica local (face-api).
 * Se o navegador estiver offline, salva na fila local (IndexedDB) e retorna { offline: true }.
 * Retorna { registro, ia } ou { offline: true, fila_id }.
 */
export async function registrarBatida({ colaborador, tipo, selfie_url, origem = "pwa", dispositivo, fallback_pin = false, lat, lng, match_score, match_dist }) {
  if (!colaborador?.id || !tipo) throw new Error("Dados insuficientes");

  const agora = new Date();
  const baseRegistro = {
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
  };

  // Modo OFFLINE: enfileira sem validar IA, marca pendente_revisao
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const registro = {
      ...baseRegistro,
      status: "pendente_revisao",
      ia_resultado: "nao_avaliado",
      ia_motivo: "Registrado offline — pendente de validação",
      observacoes: "[offline]",
    };
    const fila_id = await enfileirarBatida({ registro, match_score, match_dist });
    return { offline: true, fila_id, registro };
  }

  // Chama validação IA (não bloqueia em caso de falha — vira pendente)
  let ia = null;
  try {
    const res = await base44.functions.invoke("validarPontoFacial", {
      colaborador_id: colaborador.id,
      selfie_url,
      match_score,
      match_dist,
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

  const registro = await base44.entities.RegistroPonto.create({
    ...baseRegistro,
    status,
    ia_resultado: ia?.resultado || "nao_avaliado",
    ia_confianca: ia?.confianca ?? null,
    ia_motivo: ia?.motivo || "",
    ia_detalhes: ia ? JSON.stringify({ ...ia, match_score, match_dist }) : "",
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
 * Salva template biométrico (descritor 128-d) e hash no Colaborador.
 * Marca consentimento se ainda não houver.
 */
export async function salvarTemplateBiometrico(colaborador_id, { descriptor, hash, versao, consentir = true }) {
  const before = await base44.entities.Colaborador.filter({ id: colaborador_id });
  const antes = before[0];
  const update = {
    biometria_template: JSON.stringify(descriptor),
    biometria_hash: hash,
    biometria_versao: versao,
  };
  if (consentir && !antes?.consentimento_biometria) {
    update.consentimento_biometria = true;
    update.consentimento_data = new Date().toISOString();
  }
  await base44.entities.Colaborador.update(colaborador_id, update);
  try {
    await registrarLog({
      modulo: "rh",
      acao: "atualizar",
      entidade: "Colaborador",
      entidade_id: colaborador_id,
      descricao: `Template biométrico gerado/atualizado (${versao})`,
      origem: "humano",
      valor_anterior: { biometria_hash: antes?.biometria_hash, biometria_versao: antes?.biometria_versao },
      valor_novo: { biometria_hash: hash, biometria_versao: versao },
      loja_id: antes?.loja_id,
      critico: false,
    });
  } catch { /* */ }
}

/**
 * Lista colaboradores ativos com template biométrico carregado para matching 1:N.
 */
export async function listarColaboradoresComTemplate(loja_id) {
  const filtros = { status: "ativo" };
  if (loja_id) filtros.loja_id = loja_id;
  const list = await base44.entities.Colaborador.filter(filtros, "nome", 500);
  return list
    .filter((c) => c.biometria_template)
    .map((c) => {
      try {
        return { ...c, descriptor: JSON.parse(c.biometria_template) };
      } catch { return null; }
    })
    .filter(Boolean);
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