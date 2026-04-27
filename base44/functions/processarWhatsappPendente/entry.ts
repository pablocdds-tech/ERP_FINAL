import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Processa manualmente uma MensagemWhatsapp já recebida (caso o webhook tenha falhado),
 * ou força reprocessamento via IA.
 * Payload: { mensagem_id, intent_forcada? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mensagem_id, intent_forcada } = await req.json();
    if (!mensagem_id) return Response.json({ error: 'mensagem_id obrigatório' }, { status: 400 });

    const list = await base44.asServiceRole.entities.MensagemWhatsapp.filter({ id: mensagem_id });
    const msg = list[0];
    if (!msg) return Response.json({ error: 'Mensagem não encontrada' }, { status: 404 });

    const intent = intent_forcada || msg.intent;
    if (!msg.arquivo_url || (intent !== "nota_fiscal" && intent !== "fechamento_vendas")) {
      return Response.json({ error: 'Sem arquivo ou intent inválida' }, { status: 400 });
    }

    let pendente_id = null;
    if (intent === "nota_fiscal") {
      const dados = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extraia da imagem/PDF de uma nota fiscal os campos solicitados.`,
        file_urls: [msg.arquivo_url],
        response_json_schema: {
          type: "object",
          properties: {
            fornecedor_nome: { type: "string" }, fornecedor_cnpj: { type: "string" },
            numero: { type: "string" }, serie: { type: "string" },
            data_emissao: { type: "string" }, valor_total: { type: "number" },
            chave_acesso: { type: "string" },
            itens: { type: "array", items: { type: "object", additionalProperties: true } },
            ia_confianca: { type: "number" }, ia_observacoes: { type: "string" },
          },
        },
      });
      const pend = await base44.asServiceRole.entities.NotaFiscalPendente.create({
        origem: "whatsapp", mensagem_whatsapp_id: msg.id, loja_id: msg.loja_id,
        arquivo_url: msg.arquivo_url, dados_extraidos: dados,
        fornecedor_nome: dados.fornecedor_nome, fornecedor_cnpj: dados.fornecedor_cnpj,
        numero: dados.numero, serie: dados.serie, data_emissao: dados.data_emissao,
        valor_total: dados.valor_total, chave_acesso: dados.chave_acesso,
        itens_extraidos: dados.itens || [], ia_confianca: dados.ia_confianca,
        ia_observacoes: dados.ia_observacoes, status: "pendente",
      });
      pendente_id = pend.id;
    } else {
      const dados = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extraia o fechamento de vendas dos dados solicitados.`,
        file_urls: [msg.arquivo_url],
        response_json_schema: {
          type: "object",
          properties: {
            data_referencia: { type: "string" },
            vendas_por_canal: { type: "array", items: { type: "object", additionalProperties: true } },
            vendas_por_pagamento: { type: "array", items: { type: "object", additionalProperties: true } },
            total_vendas: { type: "number" },
            ia_confianca: { type: "number" }, ia_observacoes: { type: "string" },
          },
        },
      });
      const pend = await base44.asServiceRole.entities.FechamentoPendente.create({
        origem: "whatsapp", mensagem_whatsapp_id: msg.id, loja_id: msg.loja_id,
        arquivo_url: msg.arquivo_url, data_referencia: dados.data_referencia,
        dados_extraidos: dados, vendas_por_canal: dados.vendas_por_canal || [],
        vendas_por_pagamento: dados.vendas_por_pagamento || [],
        total_vendas: dados.total_vendas, ia_confianca: dados.ia_confianca,
        ia_observacoes: dados.ia_observacoes, status: "pendente",
      });
      pendente_id = pend.id;
    }
    await base44.asServiceRole.entities.MensagemWhatsapp.update(msg.id, { processada: true, intent });
    return Response.json({ ok: true, pendente_id, intent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});