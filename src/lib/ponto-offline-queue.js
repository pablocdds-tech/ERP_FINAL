// Fila offline de batidas de ponto, baseada em IndexedDB.
// Salva localmente quando offline e sincroniza quando voltar conexão.
import { openDB } from "idb";
import { base44 } from "@/api/base44Client";
import { registrarLog } from "./auditoria-service";

const DB_NAME = "ponto-offline";
const STORE = "fila";
const VERSION = 1;

async function db() {
  return openDB(DB_NAME, VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

/**
 * Salva uma batida na fila local. Retorna o id local.
 */
export async function enfileirarBatida(payload) {
  const d = await db();
  const id = await d.add(STORE, {
    ...payload,
    criado_em: new Date().toISOString(),
    tentativas: 0,
  });
  return id;
}

export async function listarFila() {
  const d = await db();
  return d.getAll(STORE);
}

export async function removerDaFila(id) {
  const d = await db();
  await d.delete(STORE, id);
}

export async function atualizarTentativa(id, dados) {
  const d = await db();
  const item = await d.get(STORE, id);
  if (!item) return;
  await d.put(STORE, { ...item, ...dados });
}

/**
 * Sincroniza a fila enviando para o backend. Retorna { enviados, falhas }.
 */
export async function sincronizarFila() {
  if (!navigator.onLine) return { enviados: 0, falhas: 0, motivo: "offline" };
  const itens = await listarFila();
  let enviados = 0, falhas = 0;
  for (const item of itens) {
    try {
      const registro = await base44.entities.RegistroPonto.create({
        ...item.registro,
        observacoes: (item.registro.observacoes || "") + " [sync_offline]",
      });
      try {
        await registrarLog({
          modulo: "rh",
          acao: "criar",
          entidade: "RegistroPonto",
          entidade_id: registro.id,
          descricao: `Ponto sincronizado da fila offline (${item.registro.tipo})`,
          origem: "sistema",
          valor_novo: registro,
          loja_id: item.registro.loja_id,
          critico: false,
        });
      } catch { /* */ }
      await removerDaFila(item.id);
      enviados++;
    } catch (e) {
      await atualizarTentativa(item.id, {
        tentativas: (item.tentativas || 0) + 1,
        ultimo_erro: e?.message || "erro",
      });
      falhas++;
    }
  }
  return { enviados, falhas };
}

/**
 * Inicializa o auto-sync: ouve eventos online e dispara sincronização.
 * Chame uma vez no app shell.
 */
let autoSyncInstalado = false;
export function instalarAutoSync() {
  if (autoSyncInstalado) return;
  autoSyncInstalado = true;
  const trigger = () => { sincronizarFila().catch(() => {}); };
  window.addEventListener("online", trigger);
  // Também tenta a cada 60s (caso o evento online não dispare)
  setInterval(() => { if (navigator.onLine) trigger(); }, 60000);
  // Tenta uma vez ao instalar
  trigger();
}

export async function tamanhoFila() {
  const d = await db();
  return d.count(STORE);
}