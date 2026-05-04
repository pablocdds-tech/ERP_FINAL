// Lógica do Agent Executor Operacional.
//
// Pipeline:
//  1) interpretarComando(): IA recebe o comando livre + lista de lojas/colaboradores
//     e devolve JSON estruturado (intenção, plano, dados).
//  2) classificar(): checa se a intenção é proibida, sensível (aprovação) ou simples.
//  3) executarPlano(): cria o registro real (Tarefa, Chamado, etc.) e devolve o ID.
//
// A camada de IA é abstraída via lib/ai-provider.js → askAI({ prompt, schema }).

import { base44 } from "@/api/base44Client";
import { askAI } from "@/lib/ai-provider";

// ----- Classificação de intenções -----------------------------------------

const INTENCOES_SIMPLES = new Set([
  "criar_tarefa",
  "criar_chamado",
  "criar_ocorrencia",
  "criar_notificacao",
  "criar_lembrete",
  "criar_checklist_simples",
  "atribuir_responsavel",
  "alterar_status_tarefa",
  "alterar_status_chamado",
  "consultar_pendencias",
  "consultar_tarefas",
  "consultar_chamados",
  "consultar_checklists",
  "consultar_manutencao",
  "consultar_fotos_checklist",
  "gerar_resumo_operacional",
  "preparar_mensagem_whatsapp",
  "enviar_notificacao_individual",
  "registrar_observacao",
]);

// Ações que existem mas sempre exigem aprovação humana.
export const INTENCOES_SENSIVEIS = {
  encerrar_chamado_critico: "Encerramento de chamado crítico exige aprovação humana.",
  cancelar_tarefa_com_responsavel: "Cancelar tarefa com responsável atribuído exige aprovação.",
  alterar_checklist_concluido: "Alterar um checklist já concluído exige aprovação.",
  aprovar_ponto: "Aprovação de ponto exige decisão humana.",
  rejeitar_ponto: "Rejeição de ponto exige decisão humana.",
  aprovar_nota_fiscal: "Aprovação de NF exige decisão humana.",
  aprovar_fechamento_caixa: "Aprovação de fechamento de caixa exige decisão humana.",
  gerar_despesa_financeira: "Gerar despesa financeira exige aprovação.",
  registrar_pagamento: "Registrar pagamento exige aprovação humana.",
  alterar_estoque: "Alterar estoque diretamente não é permitido — exige aprovação.",
  excluir_registro: "Exclusão de registros exige aprovação.",
  alterar_escala: "Alterar escala de funcionário exige aprovação.",
  aplicar_advertencia: "Advertência ou suspensão exige aprovação.",
  disparar_mensagem_massa: "Mensagem em massa pelo WhatsApp exige aprovação.",
};

// Ações totalmente proibidas — nem com aprovação saem por aqui.
export const INTENCOES_PROIBIDAS = {
  apagar_dados_definitivamente: "Apagar dados definitivamente não é permitido.",
  baixar_conta: "Baixar conta como paga não é permitido pelo Executor.",
  movimentar_dinheiro: "Movimentação financeira não é permitida pelo Executor.",
  alterar_saldo_bancario: "Alterar saldo bancário não é permitido.",
  alterar_banco_virtual: "Alterar Banco Virtual não é permitido.",
  alterar_socio_empresa: "Alterar Sócio x Empresa não é permitido.",
  alterar_estoque_direto: "Alterar estoque diretamente não é permitido.",
  aprovar_nf_automatico: "Aprovação automática de NF não é permitida.",
  aprovar_ponto_automatico: "Aprovação automática de ponto não é permitida.",
  demitir_funcionario: "Demissão de funcionário não é permitida pelo Executor.",
  aplicar_punicao_trabalhista: "Aplicar punição trabalhista não é permitido pelo Executor.",
  disparar_campanha_marketing: "Disparar campanha de marketing não é permitido sem aprovação humana.",
  editar_dados_financeiros: "Editar dados financeiros sensíveis não é permitido.",
};

export function classificar(intencao) {
  if (INTENCOES_PROIBIDAS[intencao]) return { tipo: "proibida", motivo: INTENCOES_PROIBIDAS[intencao] };
  if (INTENCOES_SENSIVEIS[intencao]) return { tipo: "sensivel", motivo: INTENCOES_SENSIVEIS[intencao] };
  if (INTENCOES_SIMPLES.has(intencao)) return { tipo: "simples" };
  return { tipo: "desconhecida", motivo: "Não consegui identificar uma ação operacional clara." };
}

// ----- Interpretação por IA -----------------------------------------------

const SCHEMA_PLANO = {
  type: "object",
  properties: {
    intencao: { type: "string" },
    plano_resumo: { type: "string", description: "Frase curta: 'Vou criar uma tarefa para...'" },
    confianca: { type: "number", description: "0 a 1" },
    precisa_esclarecimento: { type: "boolean" },
    pergunta_esclarecimento: { type: "string" },
    modulo_afetado: { type: "string", enum: ["rotinas", "rh", "operacoes", "atendimento", "vendas", "comunicacao", "ia", "outro"] },
    dados: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        descricao: { type: "string" },
        loja_nome: { type: "string", description: "Nome da loja extraído do comando" },
        loja_id: { type: "string", description: "ID resolvido da loja, se reconhecível" },
        responsavel_nome: { type: "string" },
        responsavel_id: { type: "string", description: "ID resolvido do colaborador, se reconhecível" },
        prazo_iso: { type: "string", description: "ISO 8601 ou data YYYY-MM-DD" },
        prioridade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
        categoria: { type: "string", enum: ["manutencao", "ti", "limpeza", "operacional", "rh", "outro"] },
        severidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
        tipo_ocorrencia: { type: "string", enum: ["operacional", "qualidade", "seguranca", "atendimento", "manutencao", "auditoria", "outro"] },
        novo_status: { type: "string" },
        registro_alvo_id: { type: "string", description: "ID do registro alvo em alterações de status / observação" },
        observacao: { type: "string" },
        mensagem_whatsapp: { type: "string", description: "Texto pronto para envio quando intenção for preparar/enviar mensagem" },
        destinatario_nome: { type: "string" },
        destinatario_telefone: { type: "string" },
        destinatario_email: { type: "string" },
      },
    },
  },
  required: ["intencao", "plano_resumo"],
};

function buildContextoSistema(lojas, colaboradores) {
  const hoje = new Date().toISOString();
  const lojasTxt = lojas.map((l) => `- ${l.id}: ${l.nome}${l.codigo ? ` (${l.codigo})` : ""}`).join("\n");
  const colabsTxt = colaboradores
    .slice(0, 80)
    .map((c) => `- ${c.id}: ${c.nome}${c.loja_id ? ` [loja ${c.loja_id}]` : ""}`)
    .join("\n");

  return `Você é o interpretador de comandos do Agent Executor Operacional.
Receba o comando do gestor e devolva APENAS JSON com a intenção, plano resumido e dados extraídos.

Hora atual: ${hoje} (America/Sao_Paulo)

LOJAS DISPONÍVEIS (use o id exato em loja_id quando reconhecer a loja no comando):
${lojasTxt || "(nenhuma loja cadastrada)"}

COLABORADORES (até 80 mais recentes — use o id exato em responsavel_id quando reconhecer a pessoa):
${colabsTxt || "(nenhum colaborador)"}

INTENÇÕES ACEITAS:
- criar_tarefa, criar_chamado, criar_ocorrencia, criar_notificacao, criar_lembrete, criar_checklist_simples
- atribuir_responsavel, alterar_status_tarefa, alterar_status_chamado, registrar_observacao
- consultar_pendencias, consultar_tarefas, consultar_chamados, consultar_checklists, consultar_manutencao, consultar_fotos_checklist
- gerar_resumo_operacional, preparar_mensagem_whatsapp, enviar_notificacao_individual

INTENÇÕES SENSÍVEIS (use uma destas se for o caso, NÃO tente executar como simples):
encerrar_chamado_critico, cancelar_tarefa_com_responsavel, alterar_checklist_concluido,
aprovar_ponto, rejeitar_ponto, aprovar_nota_fiscal, aprovar_fechamento_caixa, gerar_despesa_financeira,
registrar_pagamento, alterar_estoque, excluir_registro, alterar_escala, aplicar_advertencia, disparar_mensagem_massa.

INTENÇÕES PROIBIDAS (sinalize, não execute):
apagar_dados_definitivamente, baixar_conta, movimentar_dinheiro, alterar_saldo_bancario,
alterar_banco_virtual, alterar_socio_empresa, alterar_estoque_direto, aprovar_nf_automatico,
aprovar_ponto_automatico, demitir_funcionario, aplicar_punicao_trabalhista,
disparar_campanha_marketing, editar_dados_financeiros.

Regras:
- Resolva loja_id e responsavel_id usando os IDs exatos da lista acima quando possível.
- Se faltar informação crítica (responsável, loja, prazo) defina precisa_esclarecimento=true e formule pergunta_esclarecimento curta.
- plano_resumo deve começar com "Vou ..." em uma frase única.
- Se a intenção não for clara, use intencao="desconhecida".`;
}

export async function interpretarComando({ comando, modelo }) {
  const [lojas, colaboradores] = await Promise.all([
    base44.entities.Loja.list("-created_date", 200).catch(() => []),
    base44.entities.Colaborador.list("-created_date", 200).catch(() => []),
  ]);

  const systemContext = buildContextoSistema(lojas, colaboradores);
  const result = await askAI({
    prompt: `Comando: "${comando}"`,
    model: modelo,
    schema: SCHEMA_PLANO,
    systemContext,
  });
  const data = result.data || {};
  return {
    intencao: data.intencao || "desconhecida",
    plano_resumo: data.plano_resumo || "Não consegui montar um plano para esse comando.",
    confianca: data.confianca ?? 0.5,
    precisa_esclarecimento: !!data.precisa_esclarecimento,
    pergunta_esclarecimento: data.pergunta_esclarecimento || "",
    modulo_afetado: data.modulo_afetado || "rotinas",
    dados: data.dados || {},
    modelo_usado: result.model,
    raw: data,
  };
}

// ----- Resolução de prazo --------------------------------------------------

function resolverPrazo(prazoIso) {
  if (!prazoIso) return null;
  // Aceita YYYY-MM-DD ou ISO completa
  const d = new Date(prazoIso);
  if (Number.isNaN(d.getTime())) return null;
  // Para Tarefa.data_limite usamos YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

// ----- Execução real ------------------------------------------------------

export async function executarPlano({ plano, comando, usuario }) {
  const d = plano.dados || {};
  const log = [];
  const stamp = (msg) => log.push(`[${new Date().toISOString()}] ${msg}`);

  let registro_entidade = null;
  let registro = null;

  switch (plano.intencao) {
    case "criar_tarefa": {
      registro_entidade = "Tarefa";
      registro = await base44.entities.Tarefa.create({
        titulo: d.titulo || comando.slice(0, 80),
        descricao: d.descricao || comando,
        loja_id: d.loja_id || undefined,
        responsavel_id: d.responsavel_id || undefined,
        criado_por: usuario?.email,
        data_limite: resolverPrazo(d.prazo_iso),
        prioridade: ["baixa", "media", "alta"].includes(d.prioridade) ? d.prioridade : "media",
        status: "pendente",
        origem_tipo: "manual",
      });
      stamp(`Tarefa criada (id ${registro.id})`);
      break;
    }

    case "criar_chamado": {
      registro_entidade = "Chamado";
      registro = await base44.entities.Chamado.create({
        titulo: d.titulo || comando.slice(0, 80),
        descricao: d.descricao || comando,
        loja_id: d.loja_id || undefined,
        categoria: ["manutencao", "ti", "limpeza", "operacional", "rh", "outro"].includes(d.categoria) ? d.categoria : "outro",
        prioridade: ["baixa", "media", "alta", "critica"].includes(d.prioridade) ? d.prioridade : "media",
        status: "aberto",
      });
      stamp(`Chamado criado (id ${registro.id})`);
      break;
    }

    case "criar_ocorrencia": {
      registro_entidade = "OcorrenciaOperacional";
      registro = await base44.entities.OcorrenciaOperacional.create({
        titulo: d.titulo || comando.slice(0, 80),
        descricao: d.descricao || comando,
        loja_id: d.loja_id || undefined,
        tipo: ["operacional", "qualidade", "seguranca", "atendimento", "manutencao", "auditoria", "outro"].includes(d.tipo_ocorrencia) ? d.tipo_ocorrencia : "operacional",
        severidade: ["baixa", "media", "alta", "critica"].includes(d.severidade) ? d.severidade : "media",
        responsavel_id: d.responsavel_id || undefined,
        origem_tipo: "manual",
        status: "aberta",
      });
      stamp(`Ocorrência criada (id ${registro.id})`);
      break;
    }

    case "criar_notificacao":
    case "criar_lembrete":
    case "enviar_notificacao_individual": {
      registro_entidade = "Notificacao";
      registro = await base44.entities.Notificacao.create({
        destinatario_email: d.destinatario_email || usuario?.email,
        tipo: "outro",
        titulo: d.titulo || "Lembrete operacional",
        mensagem: d.descricao || d.mensagem_whatsapp || comando,
        link: d.link,
      });
      stamp(`Notificação criada (id ${registro.id})`);
      break;
    }

    case "registrar_observacao": {
      if (!d.registro_alvo_id) throw new Error("Não foi informado o registro alvo da observação.");
      registro_entidade = "ComentarioOperacional";
      registro = await base44.entities.ComentarioOperacional.create({
        entidade_origem: d.tipo_ocorrencia || "Tarefa",
        entidade_id: d.registro_alvo_id,
        comentario: d.observacao || d.descricao || comando,
        autor_email: usuario?.email,
      });
      stamp(`Observação registrada (id ${registro.id})`);
      break;
    }

    case "alterar_status_tarefa": {
      if (!d.registro_alvo_id) throw new Error("Tarefa alvo não identificada.");
      const valid = ["pendente", "em_andamento", "concluida"];
      if (!valid.includes(d.novo_status)) throw new Error(`Status inválido: ${d.novo_status}`);
      registro_entidade = "Tarefa";
      registro = await base44.entities.Tarefa.update(d.registro_alvo_id, {
        status: d.novo_status,
        ...(d.novo_status === "concluida" ? { concluida_em: new Date().toISOString() } : {}),
      });
      stamp(`Tarefa ${d.registro_alvo_id} → ${d.novo_status}`);
      break;
    }

    case "alterar_status_chamado": {
      if (!d.registro_alvo_id) throw new Error("Chamado alvo não identificado.");
      const valid = ["aberto", "em_atendimento", "resolvido"];
      if (!valid.includes(d.novo_status)) throw new Error(`Status inválido: ${d.novo_status}`);
      registro_entidade = "Chamado";
      registro = await base44.entities.Chamado.update(d.registro_alvo_id, {
        status: d.novo_status,
      });
      stamp(`Chamado ${d.registro_alvo_id} → ${d.novo_status}`);
      break;
    }

    case "atribuir_responsavel": {
      if (!d.registro_alvo_id || !d.responsavel_id) throw new Error("Faltou registro alvo ou responsável.");
      registro_entidade = "Tarefa";
      registro = await base44.entities.Tarefa.update(d.registro_alvo_id, {
        responsavel_id: d.responsavel_id,
      });
      stamp(`Responsável da tarefa ${d.registro_alvo_id} = ${d.responsavel_id}`);
      break;
    }

    case "criar_checklist_simples": {
      registro_entidade = "Checklist";
      registro = await base44.entities.Checklist.create({
        nome: d.titulo || "Checklist simples",
        descricao: d.descricao || comando,
        loja_id: d.loja_id || undefined,
        ativo: true,
      });
      stamp(`Checklist criado (id ${registro.id})`);
      break;
    }

    case "preparar_mensagem_whatsapp": {
      // Apenas prepara — não envia.
      registro_entidade = "EventoAutomacao";
      const payload = {
        tipo_evento: "executor.mensagem.preparada",
        destinatario: d.destinatario_nome,
        telefone: d.destinatario_telefone,
        mensagem: d.mensagem_whatsapp || d.descricao,
        loja_id: d.loja_id,
        prioridade: d.prioridade,
        origem: "Agent Executor Operacional",
        registro_relacionado: d.registro_alvo_id,
      };
      registro = await base44.entities.EventoAutomacao.create({
        tipo_evento: "executor.mensagem.preparada",
        origem: "agent",
        destino: "n8n",
        payload: JSON.stringify(payload),
        status: "pendente",
      });
      stamp(`Mensagem preparada para n8n (evento ${registro.id})`);
      break;
    }

    case "consultar_pendencias":
    case "consultar_tarefas":
    case "consultar_chamados":
    case "consultar_checklists":
    case "consultar_manutencao":
    case "consultar_fotos_checklist":
    case "gerar_resumo_operacional": {
      // Consultas são respondidas no chat por geração de texto.
      // Marcamos como executado só para fins de log; o texto fica na resposta da IA.
      stamp(`Consulta executada (sem registro persistente).`);
      break;
    }

    default:
      throw new Error(`Intenção não suportada para execução: ${plano.intencao}`);
  }

  return {
    registro_entidade,
    registro_id: registro?.id || null,
    log_execucao: log.join("\n"),
    dados_depois: registro ? JSON.stringify(registro) : null,
  };
}