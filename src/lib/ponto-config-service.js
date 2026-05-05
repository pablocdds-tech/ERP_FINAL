import { base44 } from "@/api/base44Client";
import { registrarLog } from "./auditoria-service";

/**
 * Serviço de configuração do Ponto Eletrônico.
 *
 * Usa a entidade ParametroGeral (chave/valor genérica) com chaves padronizadas
 * pelo prefixo "ponto.*". Centraliza defaults seguros para que telas e o backend
 * possam consultar tolerâncias de geolocalização, horário, biometria, etc.
 *
 * Defaults conservadores: o sistema funciona mesmo sem nenhum parâmetro salvo.
 */

export const PONTO_PARAMS = {
  // Geolocalização
  "ponto.geo.exigir": {
    categoria: "operacional",
    descricao: "Exigir geolocalização ao bater ponto (true/false).",
    default: "false",
    tipo: "bool",
    label: "Exigir localização",
    grupo: "geo",
  },
  "ponto.geo.raio_metros": {
    categoria: "operacional",
    descricao: "Raio máximo (em metros) entre a batida e a loja para aceitar sem revisão.",
    default: "300",
    tipo: "number",
    label: "Raio máximo (m)",
    grupo: "geo",
  },
  // Horário / tolerância
  "ponto.horario.tolerancia_min": {
    categoria: "operacional",
    descricao: "Tolerância em minutos (antes/depois) sobre o horário previsto na escala.",
    default: "10",
    tipo: "number",
    label: "Tolerância (min)",
    grupo: "horario",
  },
  "ponto.horario.permitir_fora_jornada": {
    categoria: "operacional",
    descricao: "Permitir bater ponto fora da jornada prevista (vai para revisão).",
    default: "true",
    tipo: "bool",
    label: "Permitir fora da jornada",
    grupo: "horario",
  },
  // Biometria / IA
  "ponto.bio.threshold_match": {
    categoria: "operacional",
    descricao: "Score mínimo (0–1) do match biométrico local para aprovar sem IA.",
    default: "0.55",
    tipo: "number",
    label: "Score mínimo do match",
    grupo: "bio",
  },
  "ponto.ia.bloquear_fraude": {
    categoria: "operacional",
    descricao: "Rejeitar automaticamente quando a IA detectar fraude (foto de tela, máscara, etc).",
    default: "true",
    tipo: "bool",
    label: "Bloquear automaticamente em caso de fraude",
    grupo: "bio",
  },
  // Operação
  "ponto.kiosk.pin_saida_hash": {
    categoria: "operacional",
    descricao: "Hash do PIN para sair do modo Kiosk. Configurado por admin (não digitar PIN aqui).",
    default: "",
    tipo: "string",
    label: "PIN de saída do Kiosk (hash)",
    grupo: "operacao",
  },
  "ponto.alerta.notificar_gestor_fraude": {
    categoria: "operacional",
    descricao: "Notificar o gestor imediatamente quando uma batida for rejeitada por fraude.",
    default: "true",
    tipo: "bool",
    label: "Notificar gestor em caso de fraude",
    grupo: "operacao",
  },
  // Kiosk — detecção automática
  "ponto.kiosk.deteccao_automatica": {
    categoria: "operacional",
    descricao: "Câmera fica ativa e reconhece o rosto automaticamente, sem clicar em Bater Ponto.",
    default: "true",
    tipo: "bool",
    label: "Detecção automática de rosto",
    grupo: "kiosk",
  },
  "ponto.kiosk.exigir_confirmacao_manual": {
    categoria: "operacional",
    descricao: "Após reconhecer, pedir confirmação manual antes de registrar o ponto.",
    default: "true",
    tipo: "bool",
    label: "Exigir confirmação manual",
    grupo: "kiosk",
  },
  "ponto.kiosk.intervalo_leitura_seg": {
    categoria: "operacional",
    descricao: "Intervalo entre tentativas de reconhecimento (em segundos).",
    default: "2",
    tipo: "number",
    label: "Intervalo de leitura (s)",
    grupo: "kiosk",
  },
  "ponto.kiosk.tentativas_antes_pin": {
    categoria: "operacional",
    descricao: "Quantas tentativas sem reconhecer antes de oferecer o PIN como fallback.",
    default: "3",
    tipo: "number",
    label: "Tentativas antes do PIN",
    grupo: "kiosk",
  },
  "ponto.kiosk.tempo_reset_seg": {
    categoria: "operacional",
    descricao: "Após sucesso/erro, quanto tempo (s) até voltar a aguardar novo rosto.",
    default: "5",
    tipo: "number",
    label: "Tempo de reset (s)",
    grupo: "kiosk",
  },
  "ponto.kiosk.bloqueio_rebatida_seg": {
    categoria: "operacional",
    descricao: "Tempo (s) que o mesmo colaborador fica bloqueado de bater novamente.",
    default: "60",
    tipo: "number",
    label: "Bloqueio de rebatida (s)",
    grupo: "kiosk",
  },
};

const PREFIX = "ponto.";

function parseValor(raw, tipo) {
  if (raw == null) return null;
  if (tipo === "bool") return String(raw).toLowerCase() === "true";
  if (tipo === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return String(raw);
}

/**
 * Lê todos os parâmetros do ponto, mesclando com defaults.
 * Retorna um objeto { chave: valorTipado }.
 */
export async function carregarConfigPonto() {
  const list = await base44.entities.ParametroGeral.filter({ ativo: true }, "-updated_date", 200);
  const map = {};
  for (const p of list) {
    if (typeof p.chave === "string" && p.chave.startsWith(PREFIX)) {
      map[p.chave] = p;
    }
  }
  const result = {};
  for (const [chave, meta] of Object.entries(PONTO_PARAMS)) {
    const reg = map[chave];
    const raw = reg?.valor ?? meta.default;
    result[chave] = parseValor(raw, meta.tipo);
  }
  result.__registros = map; // útil para a tela saber se existe registro físico
  return result;
}

/**
 * Salva (cria ou atualiza) um parâmetro do ponto.
 * Faz auditoria automaticamente.
 */
export async function salvarParametroPonto(chave, valor) {
  const meta = PONTO_PARAMS[chave];
  if (!meta) throw new Error(`Parâmetro desconhecido: ${chave}`);

  const valorStr = String(valor);
  const existentes = await base44.entities.ParametroGeral.filter({ chave });
  const atual = existentes[0];

  let registro;
  const valorAnterior = atual?.valor ?? meta.default;
  if (atual) {
    registro = await base44.entities.ParametroGeral.update(atual.id, {
      valor: valorStr,
      categoria: meta.categoria,
      descricao: meta.descricao,
      ativo: true,
    });
  } else {
    registro = await base44.entities.ParametroGeral.create({
      chave,
      valor: valorStr,
      categoria: meta.categoria,
      descricao: meta.descricao,
      ativo: true,
    });
  }

  try {
    await registrarLog({
      modulo: "rh",
      acao: atual ? "atualizar" : "criar",
      entidade: "ParametroGeral",
      entidade_id: registro?.id,
      descricao: `Parâmetro ponto "${chave}" alterado: ${valorAnterior} → ${valorStr}`,
      origem: "humano",
      valor_anterior: { valor: valorAnterior },
      valor_novo: { valor: valorStr },
      critico: false,
    });
  } catch { /* auditoria nunca bloqueia */ }

  return registro;
}

/**
 * Calcula a distância em metros entre dois pontos (Haversine).
 */
export function distanciaMetros(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || isNaN(v))) return null;
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}