import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function telefoneLimpo(v) { return String(v || '').replace(/\D/g, ''); }

function textoLojaPossivel(texto) {
  const t = String(texto || '').toLowerCase();
  if (/\b(nb|nova bet[aâ]nia|vitaliano nb)\b/i.test(t)) return ['NB', 'Nova Betânia', 'Vitaliano NB'];
  if (/\b(pra[cç]a|vitaliano pra[cç]a)\b/i.test(t)) return ['PRAÇA', 'Praça', 'Vitaliano Praça'];
  if (/\b(cd|central)\b/i.test(t)) return ['CD', 'Central'];
  return [];
}

async function resolverLoja(sr, texto, funcionario) {
  const termos = textoLojaPossivel(texto);
  const lojas = await sr.entities.Loja.list('nome', 500);
  for (const termo of termos) {
    const alvo = termo.toLowerCase();
    const loja = lojas.find((l) => String(l.codigo || '').toLowerCase() === alvo || String(l.nome || '').toLowerCase().includes(alvo));
    if (loja) return loja.id;
  }
  return funcionario?.loja_padrao || null;
}

function permitidoNaLoja(funcionario, lojaId) {
  if (!lojaId) return true;
  const permitidas = funcionario.lojas_permitidas || [];
  if (permitidas.length === 0) return lojaId === funcionario.loja_padrao;
  return permitidas.includes(lojaId) || lojaId === funcionario.loja_padrao;
}

async function auditar(sr, descricao, registro, status = 'sucesso') {
  await sr.entities.LogAuditoria.create({
    data_hora: new Date().toISOString(), origem: 'sistema', modulo: 'financeiro', acao: 'criar',
    entidade: 'inbox_financeiro_whatsapp', entidade_id: registro?.id, descricao, status,
    loja_id: registro?.loja_id, valor_novo: JSON.stringify(registro || {}).slice(0, 4000)
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    const body = await req.json();
    const expected = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
    if (expected && body.shared_secret !== expected) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const telefone = telefoneLimpo(body.sender_phone || body.telefone_remetente || body.from);
    const texto = body.texto || body.text || body.mensagem || '';
    const arquivo_url = body.arquivo_url || body.file_url || body.media_url || null;
    const tipo_arquivo = body.tipo_arquivo || body.media_type || (arquivo_url ? 'arquivo' : 'texto');
    const now = new Date().toISOString();

    const funcionario = (await sr.entities.funcionarios_whatsapp.filter({ telefone }))[0];
    const baseRegistro = {
      telefone_remetente: telefone,
      funcionario_id: funcionario?.id,
      mensagem_original: texto,
      origem: 'whatsapp',
      tipo_arquivo,
      arquivo_url,
      criado_em: now,
    };

    if (!funcionario) {
      const reg = await sr.entities.inbox_financeiro_whatsapp.create({ ...baseRegistro, status: 'erro', erro: 'número não autorizado' });
      await auditar(sr, 'WhatsApp financeiro bloqueado: número não autorizado', reg, 'erro');
      return Response.json({ ok: true, inbox_id: reg.id, status: 'erro', resposta_whatsapp: 'Este número não está autorizado a enviar lançamentos para o sistema.' });
    }
    if (funcionario.ativo === false) {
      const reg = await sr.entities.inbox_financeiro_whatsapp.create({ ...baseRegistro, status: 'erro', erro: 'funcionário inativo' });
      await auditar(sr, 'WhatsApp financeiro bloqueado: funcionário inativo', reg, 'erro');
      return Response.json({ ok: true, inbox_id: reg.id, status: 'erro', resposta_whatsapp: 'Seu acesso ao envio de lançamentos está desativado. Fale com o administrador.' });
    }
    if (funcionario.pode_enviar_lancamento === false) {
      const reg = await sr.entities.inbox_financeiro_whatsapp.create({ ...baseRegistro, status: 'erro', erro: 'sem permissão para enviar lançamento' });
      await auditar(sr, 'WhatsApp financeiro bloqueado: sem permissão para enviar', reg, 'erro');
      return Response.json({ ok: true, inbox_id: reg.id, status: 'erro', resposta_whatsapp: 'Você não tem permissão para enviar lançamentos financeiros pelo WhatsApp.' });
    }

    const loja_id = await resolverLoja(sr, texto, funcionario);
    const reg = await sr.entities.inbox_financeiro_whatsapp.create({ ...baseRegistro, loja_id, status: 'recebido' });
    await auditar(sr, 'Pré-lançamento recebido pelo WhatsApp financeiro', reg);

    if (!permitidoNaLoja(funcionario, loja_id)) {
      await sr.entities.inbox_financeiro_whatsapp.update(reg.id, { status: 'erro', erro: 'funcionário sem permissão para a loja informada' });
      return Response.json({ ok: true, inbox_id: reg.id, status: 'erro', resposta_whatsapp: 'Você não tem permissão para lançar despesas nesta loja.' });
    }

    await sr.functions.invoke('processarInboxFinanceiroWhatsapp', { inbox_financeiro_id: reg.id, internal: true });
    const atualizado = (await sr.entities.inbox_financeiro_whatsapp.filter({ id: reg.id }))[0] || reg;

    let resposta = 'Lançamento recebido ✅ Estou analisando as informações.';
    if (atualizado.status === 'duplicado') resposta = 'Possível lançamento duplicado ⚠️\nEnviado para revisão no ERP.';
    else if (atualizado.status === 'precisa_revisao') resposta = 'Recebi o lançamento, mas faltam informações para classificar com segurança ⚠️\nEle foi enviado para revisão no ERP.';
    else if (atualizado.status === 'aguardando_confirmacao') resposta = `Lançamento identificado ✅\nLoja: ${atualizado.loja_id || '-'}\nTipo: ${atualizado.tipo_entrada || '-'}\nFornecedor: ${atualizado.fornecedor_nome || '-'}\nValor: R$ ${Number(atualizado.valor_total || 0).toFixed(2)}\nCategoria sugerida: ${atualizado.categoria_financeira_sugerida || '-'}\nStatus: aguardando conferência no ERP.`;

    return Response.json({ ok: true, inbox_id: reg.id, status: atualizado.status, resposta_whatsapp: resposta });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});