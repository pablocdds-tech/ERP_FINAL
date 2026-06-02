import { base44 } from "@/api/base44Client";
import { proximoEventoPonto } from "./rh-service";
import { registrarLog } from "./auditoria-service";
import { enfileirarBatida } from "./ponto-offline-queue";
import { podeRegistrarPonto } from "./ponto-permissoes";

const TZ_EMPRESA = "America/Sao_Paulo";

function dataLocalEmpresa(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_EMPRESA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Faz upload de um Blob como arquivo (jpg).
 */
export async function uploadFotoBlob(blob, name = "selfie.jpg") {
  const file = new File([blob], name, { type: blob.type || "image/jpeg" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Registra batida de ponto via backend SEGURO (registrarPontoSeguro).
 *
 * Esta é a ÚNICA forma oficial de criar RegistroPonto a partir do frontend.
 * Toda validação (status, permissão, dispositivo, loja, PIN, foto, NSR/hash)
 * acontece no servidor.
 *
 * Se offline, salva na fila local (sincroniza depois via mesmo backend).
 *
 * Parâmetros:
 *  { colaborador, tipo, selfie_url, origem, dispositivo, fallback_pin, pin,
 *    lat, lng, match_score, match_dist, threshold_usado,
 *    ia_resultado, ia_confianca, ia_motivo, ia_detalhes }
 *
 * Retorna { registro } | { offline: true, fila_id, registro }.
 * Lança Error com .codigo/.bloqueio em caso de falha de validação.
 */
export async function registrarBatida({
  colaborador, tipo, selfie_url, origem = "pwa",
  dispositivo, fallback_pin = false, pin,
  lat, lng, match_score, match_dist, threshold_usado,
  ia_resultado, ia_confianca, ia_motivo, ia_detalhes,
}) {
  if (!colaborador?.id || !tipo) throw new Error("Dados insuficientes");

  // Pré-validação client-side (UX) — backend revalida tudo
  const permissao = podeRegistrarPonto(colaborador, origem === "kiosk_auto" ? "kiosk" : origem);
  if (!permissao.ok) {
    const err = new Error(permissao.motivo);
    err.codigo = permissao.codigo;
    err.bloqueio = true;
    throw err;
  }

  if (!selfie_url && !fallback_pin) {
    const err = new Error("Selfie obrigatória.");
    err.codigo = "sem_foto"; err.bloqueio = true;
    throw err;
  }
  if (!selfie_url && fallback_pin) {
    const err = new Error("Não é possível registrar ponto por PIN sem foto.");
    err.codigo = "sem_foto"; err.bloqueio = true;
    throw err;
  }

  const payload = {
    colaborador_id: colaborador.id,
    tipo, origem,
    loja_id: colaborador.loja_id,
    device_id: dispositivo,
    selfie_url, lat, lng,
    fallback_pin: !!fallback_pin, pin: fallback_pin ? pin : undefined,
    match_score, match_dist, threshold_usado,
    ia_resultado, ia_confianca, ia_motivo, ia_detalhes,
  };

  // Modo OFFLINE: enfileira para sincronizar
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const fila_id = await enfileirarBatida({
      payload: { ...payload, offline_ts: new Date().toISOString() },
    });
    return { offline: true, fila_id, registro: null };
  }

  // Chama backend seguro — captura motivo técnico real mesmo em status 4xx
  let res, data;
  try {
    res = await base44.functions.invoke("registrarPontoSeguro", payload);
    data = res?.data || {};
  } catch (httpErr) {
    // SDK pode lançar em 4xx/5xx — extrai o body do erro com motivo técnico
    const body = httpErr?.response?.data || httpErr?.data || {};
    const status = httpErr?.response?.status || httpErr?.status;
    const motivo = body.motivo || httpErr?.message || `Erro HTTP ${status || ""}`.trim();
    const err = new Error(motivo);
    err.codigo = body.codigo || "erro_http";
    err.status = status;
    err.bloqueio = true;
    throw err;
  }
  if (!data.ok) {
    const err = new Error(data.motivo || "Falha ao registrar ponto.");
    err.codigo = data.codigo || "erro";
    err.bloqueio = true;
    throw err;
  }
  return { registro: data.registro, ia: ia_resultado ? { resultado: ia_resultado, confianca: ia_confianca, motivo: ia_motivo } : null };
}

/**
 * Próximo evento (entrada/intervalo/saída) para o colaborador hoje.
 */
export async function obterProximoEvento(colaborador_id) {
  const hoje = dataLocalEmpresa();
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
 * Lista colaboradores ativos com template biométrico para matching 1:N.
 *
 * Multi-loja: o Kiosk reconhece QUALQUER colaborador ativo da empresa,
 * não apenas os da loja do dispositivo. O parâmetro loja_id é ignorado
 * propositalmente — mantido na assinatura por retrocompatibilidade.
 *
 * Filtros aplicados (defesa em profundidade — backend revalida tudo):
 *  - status === "ativo"
 *  - !bloqueado_para_ponto
 *  - pode_bater_ponto_pelo_kiosk !== false
 *  - tem template biométrico
 */
export async function listarColaboradoresComTemplate(/* loja_id ignorado */) {
  const list = await base44.entities.Colaborador.filter({ status: "ativo" }, "nome", 2000);
  return list
    .filter((c) => !c.bloqueado_para_ponto)
    .filter((c) => c.pode_bater_ponto_pelo_kiosk !== false)
    .filter((c) => c.biometria_template)
    .map((c) => {
      try {
        return { ...c, descriptor: JSON.parse(c.biometria_template) };
      } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Identifica colaborador no Kiosk a partir do PIN (apenas para LOOKUP — nunca confirma a batida).
 * Retorna o colaborador candidato; a validação real do PIN acontece no backend
 * (registrarPontoSeguro com fallback_pin=true e pin enviado).
 *
 * Estratégia: pega todos da loja ativos e filtra por hash usando o salt de cada um.
 * O custo é baixo (uma loja típica tem dezenas de colaboradores).
 */
/**
 * Lookup de colaborador via PIN no Kiosk.
 * Multi-loja: busca qualquer colaborador ativo da empresa, não só da loja
 * do dispositivo. A validação real do PIN acontece no backend.
 * O parâmetro loja_id é ignorado propositalmente (retrocompat).
 */
export async function identificarColaboradorPorPin(pin /* , loja_id ignorado */) {
  if (!pin) return null;
  const list = await base44.entities.Colaborador.filter({ status: "ativo" }, "nome", 2000);
  for (const c of list) {
    if (c.bloqueado_para_ponto) continue;
    if (c.pode_bater_ponto_pelo_kiosk === false) continue;
    if (!c.pin_ponto_hash || !c.pin_ponto_salt) continue;
    const calc = await sha256Hex(`${c.pin_ponto_salt}|${pin}`);
    if (calc === c.pin_ponto_hash) return c;
  }
  return null;
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}