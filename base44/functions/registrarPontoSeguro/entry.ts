import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend SEGURO de registro de ponto.
 *
 * É a ÚNICA forma oficial de criar RegistroPonto. Faz todas as validações
 * de segurança server-side: status do colaborador, permissão por origem,
 * dispositivo Kiosk autorizado, pertencimento à loja, foto obrigatória,
 * validação de PIN (hash), bloqueio anti-rebatida, geração de NSR + hash.
 *
 * Payload:
 *  {
 *    colaborador_id, tipo, origem,
 *    loja_id, device_id, selfie_url,
 *    lat, lng, fallback_pin, pin,
 *    match_score, match_dist, threshold_usado,
 *    ia_resultado, ia_confianca, ia_motivo, ia_detalhes,
 *    offline_ts (ISO opcional para sync offline),
 *    metadata
 *  }
 *
 * Retorna:
 *  Sucesso → { ok: true, registro }
 *  Falha   → { ok: false, codigo, motivo, status: 4xx }
 */

const ALG = 'sha256-v1';
const BLOQUEIO_REBATIDA_DEFAULT_SEG = 60;
const TZ_EMPRESA = 'America/Sao_Paulo';

// Extrai a data (AAAA-MM-DD) no fuso da empresa a partir de um instante ISO/UTC.
// Necessário porque uma batida às 22h (BRT) é "amanhã" em UTC — sem isso a
// batida cairia no dia errado e sumiria da tela "Ponto do Dia".
function dataLocalEmpresa(isoString) {
  const d = new Date(isoString);
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_EMPRESA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // en-CA → "AAAA-MM-DD"
  return partes;
}

async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function payloadCanonico(r) {
  return JSON.stringify({
    nsr: r.nsr,
    colaborador_id: r.colaborador_id,
    loja_id: r.loja_id || '',
    data: r.data,
    tipo: r.tipo,
    horario: r.horario,
    origem: r.origem || 'pwa',
    fallback_pin: !!r.fallback_pin,
  });
}

async function calcularHashRegistro(registro, hashAnterior) {
  return sha256Hex(`${hashAnterior}|${payloadCanonico(registro)}`);
}

async function proximoNsrEHash(serviceRole) {
  // NSR é GLOBAL e único — uma cadeia só para toda a empresa,
  // independente da loja onde a batida ocorreu. Evita NSR duplicado
  // em cenários de batida cruzada entre lojas.
  const ultimos = await serviceRole.entities.RegistroPonto.filter({}, '-nsr', 1);
  const ultimo = ultimos[0];
  return {
    nsr: (ultimo?.nsr || 0) + 1,
    hash_anterior: ultimo?.hash_registro || '0',
  };
}

async function loadConfig(serviceRole) {
  try {
    const list = await serviceRole.entities.ParametroGeral.filter({ ativo: true }, '-updated_date', 200);
    const map = {};
    for (const p of list) if (p?.chave?.startsWith?.('ponto.')) map[p.chave] = p.valor;
    return map;
  } catch { return {}; }
}

async function logAud(serviceRole, p) {
  try {
    await serviceRole.entities.LogAuditoria.create({
      data_hora: new Date().toISOString(),
      usuario_email: p.usuario_email,
      usuario_nome: p.usuario_nome,
      origem: p.origem_log || 'sistema',
      modulo: 'rh',
      acao: p.acao || 'outros',
      entidade: p.entidade || 'RegistroPonto',
      entidade_id: p.entidade_id,
      descricao: p.descricao,
      valor_novo: p.valor_novo ? JSON.stringify(p.valor_novo).slice(0, 4000) : undefined,
      valor_anterior: p.valor_anterior ? JSON.stringify(p.valor_anterior).slice(0, 4000) : undefined,
      status: 'sucesso',
      critico: !!p.critico,
      loja_id: p.loja_id,
    });
  } catch { /* auditoria nunca bloqueia */ }
}

function fail(codigo, motivo, status = 400) {
  return Response.json({ ok: false, codigo, motivo }, { status });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('metodo_invalido', 'Método inválido', 405);
  let body;
  try { body = await req.json(); } catch { return fail('payload_invalido', 'JSON inválido'); }

  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;

  // 1) Autenticação obrigatória
  let user = null;
  try { user = await base44.auth.me(); } catch { /* */ }
  if (!user) return fail('nao_autenticado', 'Usuário não autenticado', 401);

  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

  const {
    colaborador_id, tipo, origem,
    loja_id: loja_payload, device_id, selfie_url,
    lat, lng, fallback_pin, pin,
    match_score, match_dist, threshold_usado,
    ia_resultado, ia_confianca, ia_motivo, ia_detalhes,
    offline_ts, metadata,
  } = body;

  // 2) Validação básica
  if (!colaborador_id) return fail('sem_colaborador', 'colaborador_id obrigatório');
  if (!tipo || !['entrada', 'intervalo_saida', 'intervalo_volta', 'saida'].includes(tipo)) {
    return fail('tipo_invalido', 'Tipo de ponto inválido');
  }
  if (!origem || !['pwa', 'kiosk', 'kiosk_auto'].includes(origem)) {
    return fail('origem_invalida', 'Origem não suportada');
  }

  // 3) Carrega colaborador
  let colaborador = null;
  try {
    const colArr = await sr.entities.Colaborador.filter({ id: colaborador_id });
    colaborador = colArr[0];
  } catch { colaborador = null; }
  if (!colaborador) {
    await logAud(sr, {
      acao: 'bloquear', descricao: 'Tentativa para colaborador inexistente',
      valor_novo: { colaborador_id, origem, device_id }, critico: true,
      usuario_email: user.email, usuario_nome: user.full_name,
    });
    return fail('colaborador_nao_encontrado', 'Colaborador não encontrado', 404);
  }

  const auditCommon = {
    usuario_email: user.email, usuario_nome: user.full_name,
    loja_id: colaborador.loja_id,
  };

  // 4) Status do colaborador
  if (colaborador.status === 'desligado') {
    await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
      descricao: `Tentativa de ponto de colaborador DESLIGADO: ${colaborador.nome}`,
      valor_novo: { colaborador_id, origem, device_id, ip, ua } });
    return fail('desligado', 'Colaborador desligado.', 403);
  }
  if (colaborador.status === 'bloqueado' || colaborador.bloqueado_para_ponto) {
    await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
      descricao: `Tentativa bloqueada (${colaborador.nome}): ${colaborador.bloqueado_motivo || 'bloqueado'}`,
      valor_novo: { colaborador_id, origem, device_id, ip, ua } });
    return fail('bloqueado', colaborador.bloqueado_motivo || 'Colaborador bloqueado para registro de ponto.', 403);
  }
  if (colaborador.status === 'afastado') {
    await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
      descricao: `Tentativa de ponto de colaborador AFASTADO: ${colaborador.nome}`,
      valor_novo: { colaborador_id, origem, device_id, ip, ua } });
    return fail('afastado', 'Colaborador afastado.', 403);
  }

  // 5) Foto obrigatória — bloqueia PIN sem foto
  if (!selfie_url || typeof selfie_url !== 'string') {
    await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
      descricao: `Tentativa sem foto (${colaborador.nome}, origem=${origem}, fallback_pin=${!!fallback_pin})`,
      valor_novo: { colaborador_id, origem, device_id, fallback_pin, ip, ua } });
    return fail('sem_foto', 'Não é possível registrar ponto sem foto.', 400);
  }

  // 6) Permissão por origem
  let loja_id_final = loja_payload || colaborador.loja_id;

  if (origem === 'pwa') {
    if (colaborador.pode_bater_ponto_pelo_pwa !== true) {
      await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
        descricao: `PWA não autorizado para ${colaborador.nome}`,
        valor_novo: { colaborador_id, origem, ip, ua } });
      return fail('pwa_nao_autorizado', 'Colaborador sem permissão para bater ponto pelo PWA.', 403);
    }
    // Ligação user ↔ colaborador, ou gestor/admin
    const eDono = colaborador.email && user.email && colaborador.email.toLowerCase() === user.email.toLowerCase();
    const eAdmin = user.role === 'admin';
    if (!eDono && !eAdmin) {
      // gestor: aceita se o colaborador for da mesma loja e o user logado também for um colaborador gestor
      const userColArr = await sr.entities.Colaborador.filter({ email: user.email });
      const userCol = userColArr[0];
      const eGestor = userCol && userCol.perfil_pwa === 'gestor' && userCol.loja_id === colaborador.loja_id;
      if (!eGestor) {
        await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
          descricao: `PWA: usuário não autorizado a bater ponto de ${colaborador.nome}`,
          valor_novo: { colaborador_id, origem, ip, ua } });
        return fail('pwa_user_nao_vinculado', 'Você não pode registrar ponto deste colaborador.', 403);
      }
    }
  }

  if (origem === 'kiosk' || origem === 'kiosk_auto') {
    if (colaborador.pode_bater_ponto_pelo_kiosk === false) {
      await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
        descricao: `Kiosk não autorizado para ${colaborador.nome}`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('kiosk_nao_autorizado', 'Colaborador sem permissão para registrar ponto neste Kiosk.', 403);
    }

    if (!device_id) {
      await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
        descricao: 'Kiosk sem device_id', valor_novo: { colaborador_id, origem, ip, ua } });
      return fail('sem_device', 'Dispositivo Kiosk não identificado.', 400);
    }

    const devArr = await sr.entities.KioskDevice.filter({ device_id });
    const device = devArr[0];
    if (!device) {
      await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
        descricao: `Kiosk não cadastrado: ${device_id}`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('device_nao_cadastrado', 'Dispositivo Kiosk não cadastrado.', 403);
    }
    if (!device.autorizado || !device.ativo) {
      await logAud(sr, { ...auditCommon, acao: 'bloquear', critico: true,
        descricao: `Kiosk não autorizado/ativo: ${device.nome_dispositivo || device_id}`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('device_nao_autorizado', 'Dispositivo Kiosk não autorizado.', 403);
    }
    // Multi-loja: a batida pode ocorrer em qualquer Kiosk autorizado.
    // loja_id_final = loja onde a batida ACONTECEU (loja do Kiosk).
    // loja_colaborador = loja PRINCIPAL do colaborador (snapshot).
    // Se forem diferentes, registramos batida_fora_loja_principal=true e
    // criamos um alerta informativo (não bloqueia).
    loja_id_final = device.loja_id;
  }

  // 7) Fallback PIN — exige hash + valida
  if (fallback_pin) {
    if (!pin || String(pin).length < 4) {
      await logAud(sr, { ...auditCommon, loja_id: loja_id_final, acao: 'bloquear', critico: true,
        descricao: `PIN ausente/curto (${colaborador.nome})`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('pin_invalido', 'PIN inválido.', 401);
    }
    if (!colaborador.pin_ponto_hash || !colaborador.pin_ponto_salt) {
      await logAud(sr, { ...auditCommon, loja_id: loja_id_final, acao: 'bloquear', critico: true,
        descricao: `Colaborador sem PIN configurado: ${colaborador.nome}`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('pin_nao_configurado', 'PIN não configurado para este colaborador.', 401);
    }
    const calc = await sha256Hex(`${colaborador.pin_ponto_salt}|${pin}`);
    if (calc !== colaborador.pin_ponto_hash) {
      await logAud(sr, { ...auditCommon, loja_id: loja_id_final, acao: 'bloquear', critico: true,
        descricao: `PIN inválido para ${colaborador.nome}`,
        valor_novo: { colaborador_id, origem, device_id, ip, ua } });
      return fail('pin_invalido', 'PIN inválido.', 401);
    }
  }

  // 8) Bloqueio anti-rebatida
  const cfg = await loadConfig(sr);
  const bloqueioSeg = Number(cfg['ponto.kiosk.bloqueio_rebatida_seg'] || BLOQUEIO_REBATIDA_DEFAULT_SEG);
  const limite = new Date(Date.now() - bloqueioSeg * 1000).toISOString();
  const recentes = await sr.entities.RegistroPonto.filter(
    { colaborador_id, horario: { $gte: limite } }, '-horario', 1
  );
  if (recentes[0]) {
    await logAud(sr, { ...auditCommon, loja_id: loja_id_final, acao: 'bloquear', critico: false,
      descricao: `Anti-rebatida: ${colaborador.nome}`,
      valor_novo: { colaborador_id, origem, device_id, ultimo_horario: recentes[0].horario, ip, ua } });
    return fail('anti_rebatida', 'Aguarde alguns instantes antes de bater novamente.', 429);
  }

  // 9) Decide status
  let status = 'registrado';
  if (fallback_pin) status = 'pendente_revisao';
  else if (ia_resultado === 'reprovado') status = 'rejeitado';
  else if (ia_resultado === 'baixa_confianca' || ia_resultado === 'precisa_revisao') status = 'pendente_revisao';
  else if (ia_resultado === 'aprovado') status = 'registrado';

  // 10) NSR (global) + hash
  const horario = offline_ts || new Date().toISOString();
  const data = dataLocalEmpresa(horario);
  const { nsr, hash_anterior } = await proximoNsrEHash(sr);

  // Multi-loja: snapshot da loja principal do colaborador e da loja do dispositivo.
  const loja_colaborador_id = colaborador.loja_id || null;
  const loja_batida_id = loja_id_final || null;
  const fora_loja_principal =
    !!(loja_colaborador_id && loja_batida_id && loja_colaborador_id !== loja_batida_id);

  const baseRegistro = {
    colaborador_id,
    loja_id: loja_id_final, // retrocompat: loja da batida
    loja_colaborador_id,
    loja_batida_id,
    batida_fora_loja_principal: fora_loja_principal,
    data, tipo, horario,
    latitude: lat, longitude: lng, selfie_url, origem,
    dispositivo: device_id,
    kiosk_device_id: (origem === 'kiosk' || origem === 'kiosk_auto') ? device_id : null,
    fallback_pin: !!fallback_pin,
  };
  const hash_registro = await calcularHashRegistro({ ...baseRegistro, nsr }, hash_anterior);

  // 11) Cria registro
  const registro = await sr.entities.RegistroPonto.create({
    ...baseRegistro,
    nsr, hash_anterior, hash_registro,
    status,
    ia_resultado: ia_resultado || 'nao_avaliado',
    ia_confianca: ia_confianca ?? null,
    ia_motivo: ia_motivo || '',
    ia_detalhes: JSON.stringify({
      match_score: match_score ?? null,
      match_dist: match_dist ?? null,
      threshold_usado: threshold_usado ?? null,
      ia: ia_detalhes ?? null,
      ip, ua, metadata: metadata || null,
    }),
    observacoes: offline_ts ? '[sync_offline]' : '',
  });

  await logAud(sr, {
    ...auditCommon, loja_id: loja_id_final,
    acao: 'criar', entidade_id: registro.id,
    descricao: `Ponto ${tipo} de ${colaborador.nome} via ${origem}${fallback_pin ? ' · PIN' : ''} (${status})`,
    valor_novo: { ...baseRegistro, status, nsr, ip, ua },
    critico: status !== 'registrado',
  });

  // 12) Alerta informativo de batida fora da loja principal (não bloqueia)
  if (fora_loja_principal) {
    await logAud(sr, {
      ...auditCommon,
      loja_id: loja_batida_id,
      acao: 'outros',
      entidade: 'RegistroPonto',
      entidade_id: registro.id,
      descricao: `Colaborador bateu ponto fora da loja principal (${colaborador.nome}): principal=${loja_colaborador_id} · batida=${loja_batida_id}`,
      valor_novo: {
        colaborador_id, origem, device_id,
        loja_colaborador_id, loja_batida_id,
      },
      critico: false,
    });
  }

  return Response.json({ ok: true, registro });
});