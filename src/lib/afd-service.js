/**
 * AFD-like service — Portaria 671/2021 (espírito, sem homologação ICP-Brasil).
 *
 * Recursos:
 * - NSR (Número Sequencial de Registro) por loja, monotônico
 * - Hash SHA-256 encadeado: cada registro contém o hash do anterior + seu próprio hash
 * - Exportação AFD-compatível (texto puro, layout Portaria 671 simplificado)
 * - Verificação de integridade: refaz a cadeia e compara hashes
 *
 * NÃO é REP-P homologado — não substitui assinatura ICP-Brasil para fiscalização do MTE.
 */

import { base44 } from "@/api/base44Client";
import { verificarPendenciasCadastraisPeriodo } from "./afd-pre-check";
import { isCpfValido, limparCpf } from "./cpf-validator";
import { registrarLog } from "./auditoria-service";

const VERSAO_LAYOUT = "PRT-671-LIKE-V1";

/* ---------- HASH ---------- */

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Conteúdo canônico do registro para hash (não inclui campos voláteis como ia_*, status final).
 */
function payloadCanonico(r) {
  return JSON.stringify({
    nsr: r.nsr,
    colaborador_id: r.colaborador_id,
    loja_id: r.loja_id || "",
    data: r.data,
    tipo: r.tipo,
    horario: r.horario,
    origem: r.origem || "pwa",
    fallback_pin: !!r.fallback_pin,
  });
}

export async function calcularHashRegistro(registro, hashAnterior) {
  return sha256Hex(`${hashAnterior}|${payloadCanonico(registro)}`);
}

/* ---------- NSR + ENCADEAMENTO ---------- */

/**
 * Calcula próximo NSR e hash_anterior.
 * NSR é GLOBAL e monotônico em toda a empresa — uma única cadeia, mesmo
 * com batidas cruzadas entre lojas. Evita NSR duplicado em multi-loja.
 *
 * Mantido o parâmetro loja_id por retrocompat mas IGNORADO.
 */
export async function proximoNsrEHash(/* loja_id ignorado */) {
  const ultimos = await base44.entities.RegistroPonto.filter({}, "-nsr", 1);
  const ultimo = ultimos[0];
  return {
    nsr: (ultimo?.nsr || 0) + 1,
    hash_anterior: ultimo?.hash_registro || "0",
  };
}

/* ---------- EXPORTAÇÃO AFD-LIKE ---------- */

const TIPO_MARCACAO = {
  entrada: "1",
  intervalo_saida: "2",
  intervalo_volta: "3",
  saida: "4",
};

function pad(s, n, c = " ", left = false) {
  s = String(s ?? "");
  if (s.length >= n) return s.slice(0, n);
  return left ? c.repeat(n - s.length) + s : s + c.repeat(n - s.length);
}

function fmtDataHora(iso) {
  const d = new Date(iso);
  const dd = pad(d.getDate(), 2, "0", true);
  const mm = pad(d.getMonth() + 1, 2, "0", true);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours(), 2, "0", true);
  const mi = pad(d.getMinutes(), 2, "0", true);
  return { data: `${dd}${mm}${yyyy}`, hora: `${hh}${mi}` };
}

/**
 * Gera AFD-like (texto). Formato simplificado, inspirado na Portaria 671.
 * Layout: NSR(9) | TIPO(1) | DATA(8) | HORA(4) | CPF(11) | HASH(64) | HASH_ANT(64)
 *
 * Multi-loja:
 *  - filtro_loja: "batida" (default) → filtra pela loja onde o ponto foi batido
 *                 "principal"          → filtra pela loja principal do colaborador
 *  - se loja_id vazio, exporta TODAS as lojas (NSR global)
 *
 * Modo:
 *  - modo="oficial" (default) → BLOQUEIA se houver colaborador sem nome/CPF válido.
 *                                Retorna { bloqueado: true, pendencias }.
 *  - modo="rascunho"           → permite gerar mesmo com pendências, marca header
 *                                como RASCUNHO e substitui CPFs ausentes/inválidos
 *                                por placeholder "00000000000" SOMENTE no rascunho
 *                                (no oficial isso nunca acontece, pois é bloqueado).
 */
export async function gerarAFD({
  loja_id, dataInicio, dataFim, filtro_loja = "batida", modo = "oficial",
}) {
  // 1) Pré-checagem cadastral (Nome + CPF)
  const preCheck = await verificarPendenciasCadastraisPeriodo({
    dataInicio, dataFim, loja_id, filtro_loja,
  });
  if (!preCheck.ok && modo === "oficial") {
    try {
      await registrarLog({
        modulo: "rh", acao: "bloquear", entidade: "RegistroPonto",
        descricao: `Exportação AFD oficial bloqueada: ${preCheck.pendencias.length} pendência(s) cadastral(is)`,
        origem: "humano", loja_id: loja_id || undefined,
        valor_novo: { dataInicio, dataFim, filtro_loja, pendencias: preCheck.pendencias.length },
        critico: true,
      });
    } catch { /* */ }
    return { bloqueado: true, pendencias: preCheck.pendencias };
  }
  // Sempre buscamos todos e filtramos em memória — assim conseguimos suportar
  // tanto loja_batida_id quanto loja_colaborador_id sem múltiplas queries.
  const todos = await base44.entities.RegistroPonto.filter({}, "nsr", 50000);

  const registros = todos.filter((r) => {
    if (!r.nsr) return false;
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

  // Cabeçalho
  const lojas = loja_id ? await base44.entities.Loja.filter({ id: loja_id }) : [];
  const loja = lojas[0];
  const colabIds = [...new Set(registros.map((r) => r.colaborador_id))];
  const colabs = colabIds.length
    ? await base44.entities.Colaborador.filter({ id: { $in: colabIds } })
    : [];
  const colabMap = Object.fromEntries(colabs.map((c) => [c.id, c]));

  const linhas = [];
  const geracao = new Date();
  const { data: dGer, hora: hGer } = fmtDataHora(geracao.toISOString());
  const tag = modo === "rascunho" ? "RASCUNHO" : "OFICIAL";
  linhas.push(
    `HEADER|${VERSAO_LAYOUT}|${tag}|${loja?.nome || "TODAS"}|${loja?.codigo || ""}|GERADO=${dGer} ${hGer}|TOTAL=${registros.length}`
  );

  for (const r of registros) {
    const c = colabMap[r.colaborador_id];
    const cpfDigitos = limparCpf(c?.cpf);
    const cpfValido = isCpfValido(cpfDigitos);
    // OFICIAL: garantido pelo pre-check — sempre temos CPF válido aqui.
    // RASCUNHO: pode ter CPF ausente/inválido → preenche com "00000000000"
    //           apenas para diagnóstico interno (nunca enviar ao contador).
    const cpf = cpfValido ? cpfDigitos : (modo === "rascunho" ? "00000000000" : pad(cpfDigitos, 11, "0", true));
    const { data, hora } = fmtDataHora(r.horario);
    linhas.push(
      [
        pad(r.nsr, 9, "0", true),
        TIPO_MARCACAO[r.tipo] || "0",
        data,
        hora,
        cpf,
        r.hash_registro || "".padEnd(64, "0"),
        r.hash_anterior || "".padEnd(64, "0"),
      ].join("|")
    );
  }

  // Trailer com hash do conteúdo todo
  const conteudo = linhas.join("\n");
  const hashFinal = await sha256Hex(conteudo);
  linhas.push(`TRAILER|HASH_TOTAL=${hashFinal}`);

  const sufixo = modo === "rascunho" ? "_RASCUNHO" : "";
  return {
    conteudo: linhas.join("\n"),
    total: registros.length,
    hash_total: hashFinal,
    modo,
    pendencias: preCheck.pendencias,
    nome_arquivo: `AFD_${loja?.codigo || "TODAS"}_${dGer}${sufixo}.txt`,
  };
}

/* ---------- VERIFICAÇÃO DE INTEGRIDADE ---------- */

/**
 * Refaz a cadeia de hashes e identifica registros adulterados.
 * Retorna { ok, total, quebrados: [{ nsr, motivo }] }.
 */
export async function verificarIntegridade(loja_id) {
  const filtros = {};
  if (loja_id) filtros.loja_id = loja_id;
  const registros = await base44.entities.RegistroPonto.filter(filtros, "nsr", 50000);

  let prevHash = "0";
  let prevNsr = 0;
  const quebrados = [];

  for (const r of registros) {
    if (!r.nsr || !r.hash_registro) continue;
    if (r.nsr !== prevNsr + 1) {
      quebrados.push({ nsr: r.nsr, motivo: `NSR fora de sequência (esperado ${prevNsr + 1})` });
    }
    if (r.hash_anterior !== prevHash) {
      quebrados.push({ nsr: r.nsr, motivo: "hash_anterior não bate com a cadeia" });
    }
    const recalc = await calcularHashRegistro(r, r.hash_anterior);
    if (recalc !== r.hash_registro) {
      quebrados.push({ nsr: r.nsr, motivo: "Conteúdo do registro foi alterado após gravação" });
    }
    prevHash = r.hash_registro;
    prevNsr = r.nsr;
  }

  return {
    ok: quebrados.length === 0,
    total: registros.filter((r) => r.nsr).length,
    quebrados,
  };
}

/* ---------- DOWNLOAD ---------- */

export function baixarTexto(nome, conteudo) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}