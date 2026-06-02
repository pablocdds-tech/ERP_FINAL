import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Rota pública (sem login): o colaborador identifica-se pelo CPF e envia o
// cadastro facial. Toda a escrita usa asServiceRole — o frontend público não
// tem token de usuário.
//
// Ações:
//  - { action: "lookup", cpf }            -> { ok, encontrado, status, nome, colaborador_id }
//  - { action: "salvar", colaborador_id,  -> { ok }
//      cpf, frontal_url, esquerda_url, direita_url,
//      biometria_template, biometria_hash, biometria_versao }

function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "lookup") {
      const cpf = soDigitos(body.cpf);
      if (cpf.length !== 11) {
        return Response.json({ ok: false, motivo: "CPF inválido." }, { status: 400 });
      }
      const todos = await base44.asServiceRole.entities.Colaborador.filter({ status: "ativo" }, "nome", 5000);
      const c = todos.find((x) => soDigitos(x.cpf) === cpf);
      if (!c) {
        return Response.json({ ok: true, encontrado: false });
      }
      return Response.json({
        ok: true,
        encontrado: true,
        colaborador_id: c.id,
        nome: c.nome,
        status: c.facial_status || "nao_cadastrada",
        ja_cadastrado: c.facial_status === "cadastrada",
      });
    }

    if (action === "salvar") {
      const cpf = soDigitos(body.cpf);
      const id = body.colaborador_id;
      if (!id || cpf.length !== 11) {
        return Response.json({ ok: false, motivo: "Dados insuficientes." }, { status: 400 });
      }
      // Revalida que o id pertence ao CPF informado (evita gravar no colaborador errado)
      const list = await base44.asServiceRole.entities.Colaborador.filter({ id });
      const c = list[0];
      if (!c || soDigitos(c.cpf) !== cpf) {
        return Response.json({ ok: false, motivo: "Colaborador não confere." }, { status: 400 });
      }

      const update = {
        facial_status: "cadastrada",
        facial_cadastrada_em: new Date().toISOString(),
        facial_cadastrada_por: "autocadastro",
      };
      if (body.frontal_url) update.facial_frontal_url = body.frontal_url;
      if (body.esquerda_url) update.facial_esquerda_url = body.esquerda_url;
      if (body.direita_url) update.facial_direita_url = body.direita_url;
      if (body.biometria_template) {
        update.biometria_template = body.biometria_template;
        update.biometria_hash = body.biometria_hash;
        update.biometria_versao = body.biometria_versao;
        if (!c.consentimento_biometria) {
          update.consentimento_biometria = true;
          update.consentimento_data = new Date().toISOString();
        }
      }

      await base44.asServiceRole.entities.Colaborador.update(id, update);
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, motivo: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, motivo: error.message }, { status: 500 });
  }
});