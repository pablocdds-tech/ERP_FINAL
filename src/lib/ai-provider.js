// Camada desacoplada de provedor de IA.
//
// Hoje: usa o InvokeLLM nativo do Base44 (sem chave própria).
// Amanhã: para usar OpenAI/Gemini com API keys próprias (n8n, NF-e, imagens,
// relatórios pesados, WhatsApp), basta trocar a implementação aqui — toda a
// aplicação consome `askAI(...)` e nunca chama o provedor diretamente.
//
// Contrato:
//   askAI({
//     prompt,            // string obrigatória
//     model,             // 'automatic' | 'gpt_5_mini' | 'gpt_5_4' | 'gpt_5_5'
//                        // | 'gemini_3_flash' | 'gemini_3_1_pro'
//                        // | 'claude_sonnet_4_6' | 'claude_opus_4_6' | 'claude_opus_4_7'
//     schema,            // JSON Schema opcional para resposta estruturada
//     files,             // array de URLs de arquivos (imagens/PDFs) opcional
//     web,               // boolean — buscar contexto na internet (gemini only)
//     systemContext,     // string opcional — contexto/papel do agente prefixado
//   })
// → retorna { text, data, model, providerRaw }
//
// `text` é sempre uma string (resposta exibível).
// `data` é o JSON estruturado quando `schema` foi fornecido (senão null).

import { base44 } from "@/api/base44Client";

// Lista canônica de modelos que a UI pode oferecer.
// Mantida aqui para que outras telas (chat, agentes) consultem um único lugar.
export const AVAILABLE_MODELS = [
  { value: "automatic", label: "Automático (padrão)", provider: "auto" },
  { value: "gpt_5_mini", label: "GPT-5 Mini", provider: "openai" },
  { value: "gpt_5_4", label: "GPT-5.4", provider: "openai" },
  { value: "gpt_5_5", label: "GPT-5.5", provider: "openai" },
  { value: "gemini_3_flash", label: "Gemini 3 Flash", provider: "google" },
  { value: "gemini_3_1_pro", label: "Gemini 3.1 Pro", provider: "google" },
  { value: "claude_sonnet_4_6", label: "Claude Sonnet 4.6", provider: "anthropic" },
  { value: "claude_opus_4_6", label: "Claude Opus 4.6", provider: "anthropic" },
];

// Modelos que suportam busca na internet (web=true)
const MODELS_WITH_WEB = new Set(["gemini_3_flash", "gemini_3_1_pro"]);

const DEFAULT_MODEL = "automatic";

/**
 * Implementação atual: InvokeLLM nativo do Base44.
 * Para trocar: substitua o corpo desta função por uma chamada a um backend
 * function que usa OpenAI/Gemini com sua API key. A assinatura externa não muda.
 */
async function callInvokeLLM({ prompt, model, schema, files, web }) {
  const wantsWeb = !!web;
  // Proteção: se o usuário pediu web mas o modelo escolhido não suporta,
  // caímos no automático para não quebrar a chamada.
  const finalModel = (wantsWeb && model && model !== "automatic" && !MODELS_WITH_WEB.has(model))
    ? "automatic"
    : (model || DEFAULT_MODEL);

  const params = {
    prompt,
    add_context_from_internet: wantsWeb,
  };
  if (schema) params.response_json_schema = schema;
  if (files && files.length > 0) params.file_urls = files;
  if (finalModel && finalModel !== "automatic") params.model = finalModel;

  const result = await base44.integrations.Core.InvokeLLM(params);

  if (schema) {
    return {
      text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      data: typeof result === "object" ? result : null,
      model: finalModel,
      providerRaw: result,
    };
  }
  return {
    text: typeof result === "string" ? result : String(result ?? ""),
    data: null,
    model: finalModel,
    providerRaw: result,
  };
}

export async function askAI({ prompt, model, schema, files, web, systemContext } = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("askAI: 'prompt' é obrigatório.");
  }
  const finalPrompt = systemContext
    ? `${systemContext}\n\n---\n\nPergunta do usuário:\n${prompt}`
    : prompt;

  return callInvokeLLM({ prompt: finalPrompt, model, schema, files, web });
}