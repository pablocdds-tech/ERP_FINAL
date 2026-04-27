import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Webhook público para receber mensagens do n8n/WhatsApp.
 * Espera payload:
 * {
 *   message_id, sender_phone, sender_nome, grupo,
 *   tipo_arquivo: "image"|"pdf"|"xml"|"text",
 *   arquivo_url, texto, data_recebimento, loja_codigo (opcional),
 *   shared_secret (verificação simples)
 * }
 *
 * Ações:
 * 1. Salva MensagemWhatsapp (idempotente por message_id).
 * 2. Detecta intent (NF / Fechamento) via IA quando há arquivo.
 * 3. Cria NotaFiscalPendente ou FechamentoPendente conforme intent.
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Use POST" }, { status: 405 });
    }
    const body = await req.json();

    const expected = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    if (expected && body.shared_secret !== expected) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!body.message_id) {
      return Response.json({ error: "message_id obrigatório" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Idempotência
    const existentes = await base44.asServiceRole.entities.MensagemWhatsapp.filter({ message_id: body.message_id });
    if (existentes[0]) {
      return Response.json({ ok: true, duplicate: true, id: existentes[0].id });
    }

    // Resolve loja por código
    let loja_id = null;
    if (body.loja_codigo) {
      const lojas = await base44.asServiceRole.entities.Loja.filter({ codigo: body.loja_codigo });
      loja_id = lojas[0]?.id;
    }

    // Detecção rápida de intent pelo texto
    const txt = (body.texto || "").toLowerCase();
    let intent = "indefinido";
    if (/(nota fiscal|nfe|nf-e|nfce|cupom fiscal)/i.test(txt)) intent = "nota_fiscal";
    else if (/(fechamento|venda do dia|caixa do dia|fechei o caixa)/i.test(txt)) intent = "fechamento_vendas";

    const msg = await base44.asServiceRole.entities.MensagemWhatsapp.create({
      message_id: body.message_id,
      sender_phone: body.sender_phone,
      sender_nome: body.sender_nome,
      grupo: body.grupo,
      tipo_arquivo: body.tipo_arquivo || "other",
      arquivo_url: body.arquivo_url,
      texto: body.texto,
      data_recebimento: body.data_recebimento || new Date().toISOString(),
      loja_id,
      intent,
      processada: false,
    });

    // Se tem arquivo + intent definido, chama IA para extrair
    let pendente_id = null;
    let pendente_tipo = null;
    if (body.arquivo_url && (intent === "nota_fiscal" || intent === "fechamento_vendas")) {
      try {
        if (intent === "nota_fiscal") {
          const dados = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extraia da imagem/PDF de uma nota fiscal os campos: fornecedor_nome, fornecedor_cnpj, numero, serie, data_emissao (YYYY-MM-DD), valor_total (number), chave_acesso. Caso seja cupom fiscal, preencha o que conseguir. Se não identificar como NF, retorne ia_confianca baixa.`,
            file_urls: [body.arquivo_url],
            response_json_schema: {
              type: "object",
              properties: {
                fornecedor_nome: { type: "string" },
                fornecedor_cnpj: { type: "string" },
                numero: { type: "string" },
                serie: { type: "string" },
                data_emissao: { type: "string" },
                valor_total: { type: "number" },
                chave_acesso: { type: "string" },
                itens: { type: "array", items: { type: "object", additionalProperties: true } },
                ia_confianca: { type: "number" },
                ia_observacoes: { type: "string" },
              },
            },
          });
          const pend = await base44.asServiceRole.entities.NotaFiscalPendente.create({
            origem: "whatsapp",
            mensagem_whatsapp_id: msg.id,
            loja_id,
            arquivo_url: body.arquivo_url,
            dados_extraidos: dados,
            fornecedor_nome: dados.fornecedor_nome,
            fornecedor_cnpj: dados.fornecedor_cnpj,
            numero: dados.numero,
            serie: dados.serie,
            data_emissao: dados.data_emissao,
            valor_total: dados.valor_total,
            chave_acesso: dados.chave_acesso,
            itens_extraidos: dados.itens || [],
            ia_confianca: dados.ia_confianca,
            ia_observacoes: dados.ia_observacoes,
            status: "pendente",
          });
          pendente_id = pend.id;
          pendente_tipo = "nota_fiscal";
        } else if (intent === "fechamento_vendas") {
          const dados = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extraia de um relatório/foto de fechamento de vendas: data_referencia (YYYY-MM-DD), vendas_por_canal (array {canal_nome, valor}), vendas_por_pagamento (array {forma_nome, valor_declarado}), total_vendas. Se não identificar como fechamento, marque ia_confianca baixa.`,
            file_urls: [body.arquivo_url],
            response_json_schema: {
              type: "object",
              properties: {
                data_referencia: { type: "string" },
                vendas_por_canal: { type: "array", items: { type: "object", additionalProperties: true } },
                vendas_por_pagamento: { type: "array", items: { type: "object", additionalProperties: true } },
                total_vendas: { type: "number" },
                ia_confianca: { type: "number" },
                ia_observacoes: { type: "string" },
              },
            },
          });
          const pend = await base44.asServiceRole.entities.FechamentoPendente.create({
            origem: "whatsapp",
            mensagem_whatsapp_id: msg.id,
            loja_id,
            arquivo_url: body.arquivo_url,
            data_referencia: dados.data_referencia,
            dados_extraidos: dados,
            vendas_por_canal: dados.vendas_por_canal || [],
            vendas_por_pagamento: dados.vendas_por_pagamento || [],
            total_vendas: dados.total_vendas,
            ia_confianca: dados.ia_confianca,
            ia_observacoes: dados.ia_observacoes,
            status: "pendente",
          });
          pendente_id = pend.id;
          pendente_tipo = "fechamento";
        }
        await base44.asServiceRole.entities.MensagemWhatsapp.update(msg.id, { processada: true });
      } catch (err) {
        await base44.asServiceRole.entities.MensagemWhatsapp.update(msg.id, {
          processada: false,
          erro_processamento: String(err?.message || err),
        });
      }
    }

    return Response.json({
      ok: true,
      mensagem_id: msg.id,
      intent,
      pendente_id,
      pendente_tipo,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});