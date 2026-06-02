import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIPOS = [
  'cupom_fiscal', 'nota_fiscal', 'recibo', 'boleto', 'comprovante_pix', 'comprovante_cartao',
  'comprovante_transferencia', 'despesa_manual_texto', 'despesa_por_audio', 'compra_estoque',
  'compra_embalagem', 'manutencao', 'material_limpeza', 'pagamento_funcionario', 'motoboy_extra',
  'sangria_caixa', 'reembolso', 'orcamento', 'outros'
];

const schemaExtracao = {
  type: 'object',
  properties: {
    tipo_entrada: { type: ['string', 'null'] },
    tipo_documento: { type: ['string', 'null'] },
    loja: { type: ['string', 'null'] },
    fornecedor: { type: 'object', properties: { nome: { type: ['string', 'null'] }, cnpj: { type: ['string', 'null'] } } },
    documento: { type: 'object', properties: { numero: { type: ['string', 'null'] }, chave_acesso: { type: ['string', 'null'] }, data_documento: { type: ['string', 'null'] }, data_vencimento: { type: ['string', 'null'] }, hora: { type: ['string', 'null'] } } },
    valores: { type: 'object', properties: { subtotal: { type: ['number', 'null'] }, desconto: { type: ['number', 'null'] }, acrescimo: { type: ['number', 'null'] }, valor_total: { type: ['number', 'null'] } } },
    pagamento: { type: 'object', properties: { forma_pagamento: { type: ['string', 'null'] }, conta_origem: { type: ['string', 'null'] }, valor_pago: { type: ['number', 'null'] } } },
    classificacao: { type: 'object', properties: { categoria_financeira_sugerida: { type: ['string', 'null'] }, centro_custo_sugerido: { type: ['string', 'null'] }, eh_compra_estoque: { type: ['boolean', 'null'] }, eh_conta_pagar: { type: ['boolean', 'null'] }, eh_despesa_paga: { type: ['boolean', 'null'] }, eh_comprovante_pagamento: { type: ['boolean', 'null'] }, eh_orcamento: { type: ['boolean', 'null'] } } },
    itens: { type: 'array', items: { type: 'object', additionalProperties: true } },
    validacoes: { type: 'object', properties: { imagem_legivel: { type: ['boolean', 'null'] }, dados_minimos_presentes: { type: ['boolean', 'null'] }, possivel_duplicidade: { type: ['boolean', 'null'] }, observacoes: { type: 'array', items: { type: 'string' } } } }
  }
};

function normalizarTipo(tipo) {
  return TIPOS.includes(tipo) ? tipo : 'outros';
}

function montarUpdate(dados) {
  const tipo = normalizarTipo(dados?.tipo_entrada);
  const valor = dados?.valores?.valor_total ?? null;
  const isComprovante = ['comprovante_pix', 'comprovante_cartao', 'comprovante_transferencia'].includes(tipo);
  const isBoleto = tipo === 'boleto';
  const isOrcamento = tipo === 'orcamento' || !!dados?.classificacao?.eh_orcamento;
  const status = dados?.validacoes?.possivel_duplicidade
    ? 'duplicado'
    : (!valor || dados?.validacoes?.dados_minimos_presentes === false ? 'precisa_revisao' : 'aguardando_confirmacao');

  return {
    tipo_entrada: tipo,
    tipo_documento: dados?.tipo_documento || null,
    fornecedor_nome: dados?.fornecedor?.nome || null,
    fornecedor_cnpj: dados?.fornecedor?.cnpj || null,
    numero_documento: dados?.documento?.numero || null,
    chave_acesso: dados?.documento?.chave_acesso || null,
    data_documento: dados?.documento?.data_documento || null,
    data_vencimento: dados?.documento?.data_vencimento || null,
    valor_total: valor,
    forma_pagamento: dados?.pagamento?.forma_pagamento || null,
    conta_origem: dados?.pagamento?.conta_origem || null,
    categoria_financeira_sugerida: dados?.classificacao?.categoria_financeira_sugerida || null,
    centro_custo_sugerido: dados?.classificacao?.centro_custo_sugerido || null,
    eh_compra_estoque: !!dados?.classificacao?.eh_compra_estoque,
    eh_conta_pagar: !!dados?.classificacao?.eh_conta_pagar || (isBoleto && !!dados?.documento?.data_vencimento),
    eh_despesa_paga: !!dados?.classificacao?.eh_despesa_paga,
    eh_comprovante_pagamento: !!dados?.classificacao?.eh_comprovante_pagamento || isComprovante,
    eh_orcamento: isOrcamento,
    json_extraido: JSON.stringify(dados, null, 2),
    observacao_ia: (dados?.validacoes?.observacoes || []).join('\n'),
    status,
    processado_em: new Date().toISOString(),
    erro: null,
  };
}

async function auditar(sr, descricao, inbox, status = 'sucesso') {
  await sr.entities.LogAuditoria.create({
    data_hora: new Date().toISOString(), origem: 'sistema', modulo: 'financeiro', acao: 'executar',
    entidade: 'inbox_financeiro_whatsapp', entidade_id: inbox.id, descricao, status,
    loja_id: inbox.loja_id, valor_novo: JSON.stringify({ status: inbox.status }).slice(0, 4000)
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const sr = base44.asServiceRole;

    if (!body.inbox_financeiro_id) return Response.json({ error: 'inbox_financeiro_id obrigatório' }, { status: 400 });
    if (!user && body.internal !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const list = await sr.entities.inbox_financeiro_whatsapp.filter({ id: body.inbox_financeiro_id });
    const inbox = list[0];
    if (!inbox) return Response.json({ error: 'Pré-lançamento não encontrado' }, { status: 404 });

    await sr.entities.inbox_financeiro_whatsapp.update(inbox.id, { status: 'processando', erro: null });

    const prompt = `Você é o agente financeiro do ERP. Interprete um pré-lançamento recebido via WhatsApp. Nunca autorize lançamento definitivo. Normalize exatamente no JSON pedido. Tipos aceitos: ${TIPOS.join(', ')}. Se valor_total estiver vazio, dados_minimos_presentes=false. Se for orçamento, eh_orcamento=true. Se for boleto com vencimento, eh_conta_pagar=true. Se for comprovante Pix/cartão/transferência, eh_comprovante_pagamento=true. Se for compra de insumos, bebidas ou embalagens, eh_compra_estoque=true. Mensagem: ${inbox.mensagem_original || ''}`;
    const dados = await sr.integrations.Core.InvokeLLM({
      prompt,
      file_urls: inbox.arquivo_url ? [inbox.arquivo_url] : undefined,
      response_json_schema: schemaExtracao,
    });

    const update = montarUpdate(dados);
    await sr.entities.inbox_financeiro_whatsapp.update(inbox.id, update);

    const antigos = await sr.entities.inbox_financeiro_itens.filter({ inbox_financeiro_id: inbox.id }, 'created_date', 500);
    for (const item of antigos) await sr.entities.inbox_financeiro_itens.delete(item.id);
    const itens = (dados.itens || []).map((i) => ({
      inbox_financeiro_id: inbox.id,
      descricao_original: i.descricao_original,
      quantidade: i.quantidade,
      unidade: i.unidade,
      valor_unitario: i.valor_unitario,
      valor_total: i.valor_total,
      produto_sugerido: i.produto_sugerido,
      categoria_sugerida: i.categoria_sugerida,
      entra_estoque: !!i.entra_estoque,
      confianca_ia: i.confianca,
    }));
    if (itens.length) await sr.entities.inbox_financeiro_itens.bulkCreate(itens);

    await auditar(sr, 'Pré-lançamento WhatsApp processado pela IA', { ...inbox, ...update });
    return Response.json({ ok: true, status: update.status, dados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});