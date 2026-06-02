import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Gera um PDF com o relatório de auditoria da integração Cardápio Web.
// Conteúdo é estático (snapshot da auditoria). Apenas admin pode gerar.

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const maxW = pageW - marginX * 2;
    let y = 56;

    const ensure = (needed) => {
      if (y + needed > pageH - 48) { doc.addPage(); y = 56; }
    };

    const title = (txt) => {
      ensure(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(txt, marginX, y);
      y += 8;
      doc.setDrawColor(229, 231, 235);
      doc.line(marginX, y, pageW - marginX, y);
      y += 16;
    };

    const para = (txt, opts = {}) => {
      const size = opts.size || 10;
      const bold = opts.bold || false;
      const color = opts.color || [55, 65, 81];
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(txt, maxW - (opts.indent || 0));
      for (const ln of lines) {
        ensure(size + 4);
        doc.text(ln, marginX + (opts.indent || 0), y);
        y += size + 4;
      }
      y += opts.gap ?? 4;
    };

    const bullet = (txt, opts = {}) => {
      const size = 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(txt, maxW - 16);
      lines.forEach((ln, i) => {
        ensure(size + 4);
        if (i === 0) { doc.setFont('helvetica', 'bold'); doc.text('•', marginX + 4, y); doc.setFont('helvetica', 'normal'); }
        doc.text(ln, marginX + 16, y);
        y += size + 4;
      });
      y += 2;
    };

    const row = (label, value) => {
      const size = 10;
      ensure(size + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      doc.setTextColor(17, 24, 39);
      const labelLines = doc.splitTextToSize(label, maxW * 0.55);
      doc.text(labelLines, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const valLines = doc.splitTextToSize(value, maxW * 0.4);
      doc.text(valLines, marginX + maxW * 0.58, y);
      y += Math.max(labelLines.length, valLines.length) * (size + 3) + 4;
    };

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text('Auditoria — Integração Cardápio Web', marginX, y);
    y += 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · Vitaliano ERP`, marginX, y);
    y += 24;

    // A) Resumo executivo
    title('A) Resumo Executivo');
    row('Endpoint público de webhook (POST, sem login)', 'Implementado e funcional');
    row('Salvamento do payload bruto', 'Implementado');
    row('Entidades de dados (pedidos, itens, eventos, logs)', 'Implementado');
    row('Upsert / deduplicação de pedidos', 'Implementado');
    row('Reflexo do pedido no PDV/KDS', 'Implementado');
    row('Segurança via secret', 'Implementado (token na URL)');
    row('Tela de auditoria (logs + eventos)', 'Parcial (sem ver payload, filtros e reprocessar)');
    row('Integração via API (polling/sync)', 'Parcial / provavelmente quebrado (rota incompatível)');
    row('Endpoint de detalhe do pedido', 'Não implementado');
    row('Polling automático agendado', 'Não implementado (só manual)');
    para('Conclusão crítica: o webhook está pronto e funcional. Como nenhum evento foi recebido (a tabela de eventos está vazia, e o sistema registra TODA chamada — até inválida), conclui-se que o Cardápio Web ainda não está configurado para enviar os pedidos para a URL do webhook.', { gap: 10 });

    // B) Arquivos
    title('B) Arquivos relacionados');
    row('functions/cardapioWebWebhook.js', 'Recebe pedidos via POST, salva evento bruto, upsert e reflete no PDV/KDS. Funcional.');
    row('functions/cardapioWebIntegration.js', 'Puxa pedidos via API (testConnection/syncOrders). URL incompatível com a doc.');
    row('functions/cardapioWebSetup.js', 'Gera URL do webhook e checa status do token. Funcional.');
    row('pages/financeiro/CardapioWebIntegracao.jsx', 'Tela de config: token, código da loja, base URL, webhook, logs. Funcional.');
    row('components/integracoes/CardapioWebLogs.jsx', 'Tabelas de logs de sync e eventos. Apenas leitura básica.');
    row('lib/cardapio-web-service.js', 'Camada frontend (nunca expõe o token). Funcional.');

    // C) Entidades
    title('C) Tabelas / Entidades');
    bullet('integrations — config da integração (loja, código, base_url, webhook_secret, token mascarado). Usada.');
    bullet('integration_webhook_events — salva TODO webhook recebido (payload bruto, status, erro). Usada.');
    bullet('integration_sync_logs — log de cada sincronização via API. Usada.');
    bullet('external_orders — pedidos importados (com dedupe_key = chave única lógica). Usada.');
    bullet('external_order_items — itens de cada pedido. Usada.');
    bullet('external_customers — clientes consolidados por telefone. Usada.');
    bullet('pdv_pedido — pedido refletido no fluxo PDV/KDS. Usada.');
    para('Não existem entidades com os nomes webhook_events, pedidos_externos ou cardapio_web_sync_state, mas os equivalentes acima cobrem essas funções.', { gap: 10 });

    // D) Fluxo atual
    title('D) Fluxo atual (quando o webhook recebe uma requisição)');
    bullet('1. Cardápio Web faz POST na URL do webhook (com ?secret=...).');
    bullet('2. Sistema lê o JSON do corpo (se o parse falhar, segue com objeto vazio, sem quebrar).');
    bullet('3. Identifica a integração pelo secret (query/header/body) ou pelo código da loja.');
    bullet('4. Registra o evento bruto SEMPRE em integration_webhook_events (mesmo se inválido -> status erro).');
    bullet('5. Se integração não identificada -> HTTP 401. Se inativa -> ignora.');
    bullet('6. Normaliza o pedido (tenta id / order_id / pedido_id / codigo).');
    bullet('7. Upsert em external_orders usando dedupe_key = cardapio_web|{loja}|{external_id}.');
    bullet('8. Recria itens, atualiza cliente e reflete o pedido no pdv_pedido (mapeando status).');
    bullet('9. Marca o evento como processado e retorna HTTP 200.');
    bullet('10. Se der erro no processamento, ainda retorna 200 (payload já salvo) com warning.');

    // E) Problemas
    title('E) Problemas encontrados (por prioridade)');
    para('CRÍTICO', { bold: true, color: [185, 28, 28], gap: 2 });
    bullet('Cardápio Web não está enviando webhooks — nenhum evento registrado. Falta cadastrar a URL no painel deles (e possivelmente solicitar habilitação ao suporte: integracao@cardapioweb.com).');
    para('ALTO', { bold: true, color: [194, 65, 12], gap: 2 });
    bullet('URL da API de polling incompatível com a doc. O código chama {base_url}/orders, mas a doc usa GET /api/partner/v1/orders. O botão Testar/Sincronizar provavelmente retorna 404.');
    bullet('Não há endpoint de detalhe do pedido (GET /api/partner/v1/orders/{order_id}). Se o webhook só mandar o ID, não há como buscar o detalhe.');
    para('MÉDIO', { bold: true, color: [161, 98, 7], gap: 2 });
    bullet('Sem polling automático. A sincronização via API só roda no clique de um botão.');
    bullet('Tela de auditoria limitada: sem ver payload completo, sem filtro por data/status/erro, sem reprocessar webhook com erro.');
    para('BAIXO', { bold: true, color: [21, 128, 61], gap: 2 });
    bullet('external_id do log pode ficar vazio se o Cardápio Web aninhar o ID em data.id / order.id (o processamento trata, mas o log não).');

    // F) Segurança
    title('F) Segurança');
    bullet('O endpoint exige um secret que identifica/autentica a loja. Sem o secret correto -> HTTP 401.');
    bullet('Risco residual: o secret vai na query string da URL (pode aparecer em logs de proxy). Não há validação de assinatura HMAC do payload (o Cardápio Web não documenta uma).');
    bullet('O token da API nunca é exposto ao frontend (fica só no secret CARDAPIO_WEB_API_TOKEN).');

    // G) Logs e erros
    title('G) Logs e erros');
    bullet('Logs de sucesso e erro de sincronização -> integration_sync_logs.');
    bullet('Logs de webhook (sucesso/erro/ignorado) -> integration_webhook_events.');
    bullet('Erros HTTP da API (401/404/429) são tratados com mensagens específicas.');
    bullet('Quando não encontra o ID do pedido, lança erro "Pedido sem identificador", mas o webhook ainda retorna 200 com warning.');

    // H) Compatibilidade com a doc
    title('H) Compatibilidade com a documentação oficial');
    row('Produção https://integracao.cardapioweb.com', 'OK (default na tela)');
    row('Sandbox https://integracao.sandbox.cardapioweb.com', 'OK (informado na tela)');
    row('Header X-API-KEY', 'OK');
    row('GET /api/partner/v1/orders (polling)', 'Incompatível: usa /orders (path errado)');
    row('GET /api/partner/v1/orders/{order_id} (detalhe)', 'Não existe');
    row('Variável de ambiente', 'Usa CARDAPIO_WEB_API_TOKEN (não CARDAPIO_WEB_API_KEY)');

    // I) O que falta
    title('I) O que ainda precisa ser feito');
    bullet('1. (Você/suporte CW) Cadastrar a URL do webhook no painel do Cardápio Web e confirmar que o webhook de pedidos está habilitado na conta.');
    bullet('2. Corrigir o path da API de polling para /api/partner/v1/orders (alinhar com a doc).');
    bullet('3. Implementar GET /api/partner/v1/orders/{order_id} para buscar detalhe quando o webhook mandar só o ID.');
    bullet('4. Criar rotina de polling automático (agendada) como fallback.');
    bullet('5. Melhorar a tela de auditoria: ver payload completo, filtros (data/status/erro) e botão de reprocessar evento com erro.');

    // Rodapé com numeração
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${total}`, pageW - marginX, pageH - 24, { align: 'right' });
      doc.text('Auditoria Cardápio Web — confidencial', marginX, pageH - 24);
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=auditoria-cardapio-web.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});