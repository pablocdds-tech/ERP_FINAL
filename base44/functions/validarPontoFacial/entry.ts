import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Valida selfie de ponto via Gemini (InvokeLLM com vision).
 * Compara com fotos de referência cadastradas para o colaborador.
 *
 * Payload: { colaborador_id, selfie_url }
 * Retorna: { resultado, confianca, motivo, detalhes }
 *   resultado: "aprovado" | "reprovado" | "baixa_confianca" | "precisa_revisao"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { colaborador_id, selfie_url } = await req.json();
    if (!colaborador_id || !selfie_url) {
      return Response.json({ error: 'Faltando colaborador_id ou selfie_url' }, { status: 400 });
    }

    // Busca colaborador
    const list = await base44.asServiceRole.entities.Colaborador.filter({ id: colaborador_id });
    const col = list[0];
    if (!col) return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });

    // Monta lista de fotos de referência cadastradas
    const refs = [col.facial_frontal_url, col.facial_esquerda_url, col.facial_direita_url].filter(Boolean);

    // Se não há referência, retorna precisa_revisao (não bloqueia, mas marca para gestor)
    if (refs.length === 0) {
      return Response.json({
        resultado: 'precisa_revisao',
        confianca: 0,
        motivo: 'Cadastro facial não realizado',
        detalhes: { sem_referencia: true },
      });
    }

    const prompt = `Você é um sistema de validação de ponto eletrônico por reconhecimento facial.
Compare a SELFIE recém-capturada (primeira imagem) com as FOTOS DE REFERÊNCIA cadastradas (demais imagens) do colaborador "${col.nome}".

Avalie:
1. Existe um rosto humano nítido na selfie? (sem_rosto, baixa_qualidade, ok)
2. Há apenas uma pessoa na imagem? (uma, varias)
3. Indícios de fraude: foto de tela, foto impressa, máscara, edição? (nenhum, suspeito_tela, suspeito_impressa, suspeito_outro)
4. A selfie aparenta ser a MESMA pessoa das referências? (sim, nao, indeterminado)
5. Confiança geral da análise (0 a 1).

Responda APENAS no JSON solicitado.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [selfie_url, ...refs],
      response_json_schema: {
        type: 'object',
        properties: {
          rosto: { type: 'string', enum: ['sem_rosto', 'baixa_qualidade', 'ok'] },
          pessoas: { type: 'string', enum: ['uma', 'varias'] },
          fraude: { type: 'string', enum: ['nenhum', 'suspeito_tela', 'suspeito_impressa', 'suspeito_outro'] },
          mesma_pessoa: { type: 'string', enum: ['sim', 'nao', 'indeterminado'] },
          confianca: { type: 'number' },
          observacao: { type: 'string' },
        },
        required: ['rosto', 'pessoas', 'fraude', 'mesma_pessoa', 'confianca'],
      },
    });

    // Decide resultado
    let resultado = 'precisa_revisao';
    let motivo = result.observacao || '';

    if (result.rosto === 'sem_rosto') {
      resultado = 'reprovado';
      motivo = motivo || 'Nenhum rosto detectado';
    } else if (result.rosto === 'baixa_qualidade') {
      resultado = 'baixa_confianca';
      motivo = motivo || 'Foto com baixa qualidade';
    } else if (result.pessoas === 'varias') {
      resultado = 'reprovado';
      motivo = motivo || 'Mais de uma pessoa detectada';
    } else if (result.fraude && result.fraude !== 'nenhum') {
      resultado = 'reprovado';
      motivo = motivo || `Indício de fraude (${result.fraude})`;
    } else if (result.mesma_pessoa === 'nao') {
      resultado = 'reprovado';
      motivo = motivo || 'Selfie não corresponde ao colaborador';
    } else if (result.mesma_pessoa === 'indeterminado' || (result.confianca ?? 0) < 0.5) {
      resultado = 'baixa_confianca';
      motivo = motivo || 'Confiança insuficiente';
    } else if (result.mesma_pessoa === 'sim' && (result.confianca ?? 0) >= 0.5) {
      resultado = 'aprovado';
    }

    return Response.json({
      resultado,
      confianca: result.confianca ?? 0,
      motivo,
      detalhes: result,
    });
  } catch (error) {
    return Response.json({
      resultado: 'precisa_revisao',
      confianca: 0,
      motivo: 'Erro na validação: ' + error.message,
      detalhes: {},
    });
  }
});