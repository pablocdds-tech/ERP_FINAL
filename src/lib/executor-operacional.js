// Lógica do Agent Executor ERP.
//
// Pipeline:
//  1) interpretarComando(): IA recebe o comando livre + lojas/fornecedores/categorias
//     e devolve JSON estruturado (intenção, plano, dados — incluindo lista de itens
//     em lote com categorização automática).
//  2) classificar(): bloqueia ações proibidas e marca ações que exigem aprovação.
//  3) executarPlano(): cria os registros reais (ContaPagar, ContaReceber, Insumo,
//     Produto, Fornecedor, Cliente, Categoria, CentroCusto, Compra, MovimentacaoEstoque).
//
// A camada de IA é abstraída via lib/ai-provider.js → askAI({ prompt, schema }).

import { base44 } from "@/api/base44Client";
import { askAI } from "@/lib/ai-provider";

// ----- Classificação de intenções -----------------------------------------

const INTENCOES_SIMPLES = new Set([
  "criar_conta_pagar",
  "criar_conta_receber",
  "criar_parcelas_pagar",
  "criar_parcelas_receber",
  "consultar_contas_pagar",
  "consultar_contas_receber",
  "classificar_despesa",
  "criar_item",
  "criar_itens_lote",
  "criar_fornecedor",
  "criar_cliente",
  "criar_categoria",
  "criar_centro_custo",
  "atualizar_item",
  "classificar_itens",
  "criar_entrada_estoque",
  "criar_saldo_inicial",
  "atualizar_estoque_minimo",
  "consultar_estoque",
  "criar_compra",
  "criar_compra_com_itens",
  "gerar_conta_pagar_compra",
  "separar_lista_por_tipo",
  "categorizar_lista",
  "identificar_duplicidades",
]);

// Ações totalmente proibidas para o Executor ERP.
export const INTENCOES_PROIBIDAS = {
  apagar_dados_definitivamente: "Apagar dados definitivamente não é permitido.",
  baixar_conta: "Baixar conta como paga não é permitido pelo Executor.",
  alterar_saldo_bancario: "Alterar saldo bancário não é permitido.",
  alterar_banco_virtual: "Alterar Banco Virtual não é permitido.",
  alterar_socio_empresa: "Alterar Sócio x Empresa não é permitido.",
  aprovar_nota_fiscal: "Aprovação de NF não é permitida pelo Executor.",
  aprovar_ponto: "Aprovação de ponto não é permitida pelo Executor.",
  aprovar_fechamento_caixa: "Aprovação de fechamento não é permitida pelo Executor.",
  alterar_ponto: "Alterar ponto não é permitido pelo Executor.",
  demitir_funcionario: "Demissão não é permitida pelo Executor.",
  aplicar_punicao_trabalhista: "Punição trabalhista não é permitida pelo Executor.",
  disparar_whatsapp: "Disparo de WhatsApp não é função deste agente.",
  disparar_campanha_marketing: "Campanhas de marketing não são função deste agente.",
};

export function classificar(plano) {
  const intencao = plano.intencao;
  if (INTENCOES_PROIBIDAS[intencao]) return { tipo: "proibida", motivo: INTENCOES_PROIBIDAS[intencao] };
  if (!INTENCOES_SIMPLES.has(intencao)) {
    return {
      tipo: "desconhecida",
      motivo: `Não consegui mapear a ação para uma intenção ERP suportada (recebi: "${intencao}"). Reformule o comando ou tente um exemplo dos atalhos.`,
    };
  }

  // Ações que exigem confirmação explícita por critérios do plano:
  const d = plano.dados || {};
  const motivos = [];
  if (Array.isArray(d.itens) && d.itens.length > 5) motivos.push(`Lote com ${d.itens.length} itens (>5).`);
  if ((intencao === "criar_conta_pagar" || intencao === "criar_conta_receber") && Number(d.valor) > 1000)
    motivos.push("Valor acima de R$ 1.000.");
  if (Array.isArray(d.parcelas) && d.parcelas.some((p) => Number(p.valor) > 1000))
    motivos.push("Parcela acima de R$ 1.000.");
  if (d.vencimento_passado) motivos.push("Vencimento anterior à data de hoje.");
  if (intencao === "atualizar_item" && d.muda_categoria) motivos.push("Alteração de categoria de item existente.");
  if (intencao === "atualizar_estoque_minimo" || intencao === "criar_saldo_inicial" || intencao === "criar_entrada_estoque")
    motivos.push("Atualização de estoque.");
  if (intencao === "criar_compra" || intencao === "criar_compra_com_itens") motivos.push("Compra com impacto em estoque.");
  if (intencao === "gerar_conta_pagar_compra") motivos.push("Geração de conta a pagar a partir de compra.");
  if (intencao === "criar_fornecedor" && d.dados_incompletos) motivos.push("Fornecedor com dados incompletos.");

  return motivos.length
    ? { tipo: "confirmacao_extra", motivo: motivos.join(" ") }
    : { tipo: "simples" };
}

// ----- Interpretação por IA -----------------------------------------------

const ITEM_BATCH = {
  type: "object",
  properties: {
    nome: { type: "string" },
    grupo: { type: "string", enum: ["insumo", "produto"], description: "Onde criar: Insumo ou Produto" },
    tipo_detalhado: {
      type: "string",
      enum: [
        "insumo_producao",
        "embalagem",
        "material_operacional",
        "produto_acabado_semielaborado",
        "produto_revenda",
        "produto_acabado",
        "produto_acabado_porcionado",
      ],
    },
    categoria: { type: "string", description: "Ex: CMV/Queijos, CMV/Embalagens pizza, Despesa operacional/Limpeza" },
    subcategoria: { type: "string" },
    unidade_medida: { type: "string", description: "Ex: KG, UN, L" },
    entra_ficha_tecnica: { type: "boolean" },
    entra_cmv: { type: "boolean" },
    impacta_dre: { type: "boolean" },
    grupo_dre_sugerido: { type: "string" },
    estoque_minimo: { type: "number" },
    custo_referencia: { type: "number" },
    motivo_revisao: { type: "string" },
  },
  required: ["nome", "grupo", "tipo_detalhado"],
};

const PARCELA = {
  type: "object",
  properties: {
    numero: { type: "number" },
    valor: { type: "number" },
    vencimento_iso: { type: "string", description: "YYYY-MM-DD" },
  },
};

const INTENCOES_VALIDAS_ENUM = [
  "criar_conta_pagar",
  "criar_conta_receber",
  "criar_parcelas_pagar",
  "criar_parcelas_receber",
  "consultar_contas_pagar",
  "consultar_contas_receber",
  "classificar_despesa",
  "criar_item",
  "criar_itens_lote",
  "criar_fornecedor",
  "criar_cliente",
  "criar_categoria",
  "criar_centro_custo",
  "atualizar_item",
  "classificar_itens",
  "criar_entrada_estoque",
  "criar_saldo_inicial",
  "atualizar_estoque_minimo",
  "consultar_estoque",
  "criar_compra",
  "criar_compra_com_itens",
  "gerar_conta_pagar_compra",
  "separar_lista_por_tipo",
  "categorizar_lista",
  "identificar_duplicidades",
  "desconhecida",
];

const SCHEMA_PLANO = {
  type: "object",
  properties: {
    intencao: {
      type: "string",
      enum: INTENCOES_VALIDAS_ENUM,
      description: "OBRIGATÓRIO escolher exatamente um valor desta lista. Se houver lista de itens para cadastrar, use criar_itens_lote.",
    },
    plano_resumo: { type: "string", description: "Frase curta executiva: 'Vou criar uma conta a pagar...'" },
    confianca: { type: "number" },
    precisa_esclarecimento: { type: "boolean" },
    pergunta_esclarecimento: { type: "string" },
    modulo_afetado: { type: "string", enum: ["cadastros", "financeiro", "operacoes", "estoque", "compras", "ia", "outro"] },
    rascunho: { type: "boolean", description: "Sugerir criar como rascunho por faltar informação não crítica" },
    motivo_rascunho: { type: "string" },
    dados: {
      type: "object",
      properties: {
        // Genéricos
        descricao: { type: "string" },
        loja_nome: { type: "string" },
        loja_id: { type: "string" },
        observacoes: { type: "string" },

        // Financeiro - conta única
        valor: { type: "number" },
        vencimento_iso: { type: "string", description: "YYYY-MM-DD" },
        vencimento_passado: { type: "boolean" },
        fornecedor_nome: { type: "string" },
        fornecedor_id: { type: "string" },
        cliente_nome: { type: "string" },
        cliente_documento: { type: "string" },
        categoria_nome: { type: "string" },
        categoria_id: { type: "string" },
        centro_custo_nome: { type: "string" },
        centro_custo_id: { type: "string" },

        // Financeiro - parcelas
        parcelas: { type: "array", items: PARCELA },

        // Cadastros - itens em lote
        itens: { type: "array", items: ITEM_BATCH },

        // Cadastros simples
        nome: { type: "string" },
        cnpj_cpf: { type: "string" },
        telefone: { type: "string" },
        email: { type: "string" },
        endereco: { type: "string" },

        // Categoria/Centro de custo
        categoria_grupo: { type: "string" },
        categoria_tipo_dre: { type: "string" },

        // Atualização de item
        item_alvo_id: { type: "string" },
        item_alvo_nome: { type: "string" },
        muda_categoria: { type: "boolean" },
        novo_estoque_minimo: { type: "number" },
        novo_estoque_maximo: { type: "number" },
        novo_compartilhado: { type: "boolean" },
        nova_loja_ids: { type: "array", items: { type: "string" } },

        // Estoque
        movimentacao_quantidade: { type: "number" },
        movimentacao_tipo: { type: "string", enum: ["entrada", "saldo_inicial"] },

        // Compra
        compra_data_iso: { type: "string" },
        compra_valor_total: { type: "number" },
        compra_gerar_conta_pagar: { type: "boolean" },
        compra_vencimento_iso: { type: "string" },
      },
    },
    dados_incompletos: { type: "boolean" },
  },
  required: ["intencao", "plano_resumo"],
};

function buildContextoSistema({ lojas, fornecedores, categorias, centrosCusto, unidades }) {
  const hoje = new Date().toISOString();
  const lojasTxt = lojas.map((l) => `- ${l.id}: ${l.nome}${l.codigo ? ` (${l.codigo})` : ""}`).join("\n");
  const fornTxt = fornecedores.slice(0, 80).map((f) => `- ${f.id}: ${f.nome}${f.cnpj_cpf ? ` (${f.cnpj_cpf})` : ""}`).join("\n");
  const catTxt = categorias.slice(0, 120).map((c) => `- ${c.id}: ${c.nome} [${c.tipo}/${c.grupo || "?"}]`).join("\n");
  const ccTxt = centrosCusto.slice(0, 60).map((c) => `- ${c.id}: ${c.nome}`).join("\n");
  const uniTxt = unidades.slice(0, 30).map((u) => `- ${u.sigla}: ${u.nome}`).join("\n");

  return `Você é o interpretador de comandos do Agent Executor ERP.
Receba o comando do usuário e devolva APENAS JSON conforme o schema, com intenção, plano resumido e dados extraídos.

Hora atual: ${hoje} (America/Sao_Paulo)

LOJAS (use o id exato em loja_id quando reconhecer):
${lojasTxt || "(nenhuma)"}

FORNECEDORES (até 80 — resolva fornecedor_id quando reconhecer):
${fornTxt || "(nenhum)"}

CATEGORIAS FINANCEIRAS (até 120 — resolva categoria_id; se não houver match, deixe em categoria_nome):
${catTxt || "(nenhuma)"}

CENTROS DE CUSTO (resolva centro_custo_id quando reconhecer):
${ccTxt || "(nenhum)"}

UNIDADES DE MEDIDA cadastradas:
${uniTxt || "(nenhuma)"}

INTENÇÕES ACEITAS:
- Financeiro: criar_conta_pagar, criar_conta_receber, criar_parcelas_pagar, criar_parcelas_receber, consultar_contas_pagar, consultar_contas_receber, classificar_despesa
- Cadastros: criar_item, criar_itens_lote, criar_fornecedor, criar_cliente, criar_categoria, criar_centro_custo, atualizar_item, classificar_itens
- Estoque: criar_entrada_estoque, criar_saldo_inicial, atualizar_estoque_minimo, consultar_estoque
- Compras: criar_compra, criar_compra_com_itens, gerar_conta_pagar_compra
- Organização: separar_lista_por_tipo, categorizar_lista, identificar_duplicidades

⚠️ USE EXATAMENTE essas chaves. Mapeamento de sinônimos comuns:
- "cadastrar item / cadastrar insumo / criar insumo / criar produto / cadastrar produto / cadastrar embalagem / cadastrar material" (1 item) → criar_item
- "cadastrar itens / cadastrar insumos / cadastrar produtos / cadastrar embalagens / criar vários / lista de itens / cadastre os seguintes" (vários itens) → criar_itens_lote
- "lançar conta a pagar / cadastrar despesa / lançar despesa / cadastrar conta de fornecedor" → criar_conta_pagar
- "lançar conta a receber / cadastrar receita / cadastrar venda corporativa" → criar_conta_receber
- "cadastrar fornecedor / criar fornecedor" → criar_fornecedor
- "cadastrar cliente / criar cliente" → criar_cliente
- "lançar entrada / lançar saldo / dar entrada de estoque" → criar_entrada_estoque
- "lançar compra / cadastrar compra / criar compra" → criar_compra ou criar_compra_com_itens

Se o comando incluir uma LISTA com mais de um item para cadastrar, use SEMPRE criar_itens_lote (mesmo que o usuário diga "cadastrar" e não "criar").

INTENÇÕES PROIBIDAS (sinalize, não execute):
apagar_dados_definitivamente, baixar_conta, alterar_saldo_bancario, alterar_banco_virtual,
alterar_socio_empresa, aprovar_nota_fiscal, aprovar_ponto, aprovar_fechamento_caixa,
alterar_ponto, demitir_funcionario, aplicar_punicao_trabalhista, disparar_whatsapp, disparar_campanha_marketing.

ESTE AGENTE NÃO CRIA TAREFAS, CHAMADOS, NOTIFICAÇÕES OU MENSAGENS — se o comando for sobre isso, retorne intencao="desconhecida".

REGRAS DE CATEGORIZAÇÃO AUTOMÁTICA DE ITENS (quando intencao=criar_itens_lote ou criar_item):
- Farinha, queijo (muçarela, cheddar, parmesão, catupiry), carnes (frango, calabresa, bacon, presunto), molho, tempero, açúcar, sal, ovos, leite → grupo=insumo, tipo_detalhado=insumo_producao, entra_ficha_tecnica=true, entra_cmv=true, impacta_dre=true, grupo_dre_sugerido="CMV", unidade KG (sólidos) ou L (líquidos).
- Caixa de pizza (G/M/P), saco kraft, pote, tampa, etiqueta, embalagem delivery → grupo=insumo, tipo_detalhado=embalagem, entra_ficha_tecnica=true, entra_cmv=true, unidade UN, grupo_dre_sugerido="CMV".
- Refrigerantes, água, sucos prontos, cervejas, bebidas prontas → grupo=produto, tipo_detalhado=produto_revenda, entra_ficha_tecnica=false, entra_cmv=true, impacta_dre=true, grupo_dre_sugerido="CMV", unidade UN.
- Detergente, álcool, sabão, papel toalha, saco de lixo, luva, desinfetante → grupo=insumo, tipo_detalhado=material_operacional, entra_ficha_tecnica=false, entra_cmv=false, impacta_dre=true, grupo_dre_sugerido="Despesas Operacionais", unidade UN ou L.
- Massa pronta, molho pronto, frango desfiado, bacon torrado, base de pizza → grupo=insumo, tipo_detalhado=produto_acabado_semielaborado, entra_ficha_tecnica=true, entra_cmv=true, unidade UN ou KG.
- Produto final vendido pronto sem revenda externa (pizza, lanche) → grupo=produto, tipo_detalhado=produto_acabado, entra_cmv=true.

Se faltar custo, unidade ou categoria, defina motivo_revisao no item e o sistema marca prioridade_revisao.

REGRAS DE INTERPRETAÇÃO FINANCEIRA:
- "vencimento dia 10/15/30" sem mês → assumir o próximo dia 10/15/30 ≥ hoje.
- "vencimento amanhã/hoje/ontem" → calcular relativo a hoje.
- vencimento_passado=true se a data for anterior a hoje.
- Se valor não for informado, marque rascunho=true e motivo_rascunho="Valor não informado".
- Se loja não for informada e o sistema tiver mais de 1 loja → rascunho=true, motivo_rascunho="Loja não informada".
- Se faltar categoria, deixe categoria_nome com sugestão (ex: "Energia elétrica") e o sistema cria a categoria depois.

REGRAS GERAIS:
- plano_resumo: frase única começando com "Vou ...".
- precisa_esclarecimento=true só quando faltar informação CRÍTICA não inferível (ex: "Cadastre uma conta de R$ 500" sem qualquer outra info).
- Resolva loja_id, fornecedor_id, categoria_id, centro_custo_id usando os IDs exatos das listas acima sempre que possível.`;
}

// Normaliza intenções entregues pela IA para a chave canônica usada pelo executor.
const SINONIMOS_INTENCAO = {
  cadastrar_conta_pagar: "criar_conta_pagar",
  lancar_conta_pagar: "criar_conta_pagar",
  cadastrar_despesa: "criar_conta_pagar",
  lancar_despesa: "criar_conta_pagar",
  cadastrar_conta_receber: "criar_conta_receber",
  lancar_conta_receber: "criar_conta_receber",
  cadastrar_receita: "criar_conta_receber",
  cadastrar_item: "criar_item",
  cadastrar_insumo: "criar_item",
  cadastrar_produto: "criar_item",
  cadastrar_embalagem: "criar_item",
  cadastrar_material: "criar_item",
  cadastrar_material_operacional: "criar_item",
  criar_insumo: "criar_item",
  criar_produto: "criar_item",
  criar_embalagem: "criar_item",
  cadastrar_itens: "criar_itens_lote",
  cadastrar_insumos: "criar_itens_lote",
  cadastrar_produtos: "criar_itens_lote",
  cadastrar_embalagens: "criar_itens_lote",
  cadastrar_materiais: "criar_itens_lote",
  cadastrar_materiais_operacionais: "criar_itens_lote",
  criar_insumos: "criar_itens_lote",
  criar_produtos: "criar_itens_lote",
  criar_embalagens: "criar_itens_lote",
  cadastrar_lote: "criar_itens_lote",
  criar_lote: "criar_itens_lote",
  cadastrar_fornecedor: "criar_fornecedor",
  cadastrar_cliente: "criar_cliente",
  cadastrar_categoria: "criar_categoria",
  cadastrar_centro_custo: "criar_centro_custo",
  lancar_entrada_estoque: "criar_entrada_estoque",
  cadastrar_entrada_estoque: "criar_entrada_estoque",
  cadastrar_saldo_inicial: "criar_saldo_inicial",
  lancar_compra: "criar_compra",
  cadastrar_compra: "criar_compra",
  cadastrar_compra_com_itens: "criar_compra_com_itens",
};

function normalizarIntencao(raw, dados) {
  if (!raw) return "desconhecida";
  const k = String(raw).toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_");
  if (SINONIMOS_INTENCAO[k]) return SINONIMOS_INTENCAO[k];
  // Já está canônica?
  if (INTENCOES_SIMPLES.has(k) || INTENCOES_PROIBIDAS[k]) return k;
  // Se tiver lista de itens, força criar_itens_lote
  if (Array.isArray(dados?.itens) && dados.itens.length > 0) return "criar_itens_lote";
  return k;
}

export async function interpretarComando({ comando, modelo, files }) {
  const [lojas, fornecedores, categorias, centrosCusto, unidades] = await Promise.all([
    base44.entities.Loja.list("-created_date", 200).catch(() => []),
    base44.entities.Fornecedor.list("-created_date", 200).catch(() => []),
    base44.entities.CategoriaFinanceira.list("-created_date", 300).catch(() => []),
    base44.entities.CentroCusto.list("-created_date", 100).catch(() => []),
    base44.entities.UnidadeMedida.list("-created_date", 50).catch(() => []),
  ]);

  const systemContext = buildContextoSistema({ lojas, fornecedores, categorias, centrosCusto, unidades });
  const temAnexos = Array.isArray(files) && files.length > 0;
  const promptComando = temAnexos
    ? `${comando ? `Comando: "${comando}"\n\n` : ""}Foram anexadas ${files.length} imagem(ns) de documento(s) (cupom fiscal / nota / comprovante de compra). Leia o documento, extraia fornecedor, valor total, data e itens, e monte o plano (ex.: criar_conta_pagar ou criar_compra_com_itens).`
    : `Comando: "${comando}"`;
  const result = await askAI({
    prompt: promptComando,
    model: modelo,
    schema: SCHEMA_PLANO,
    systemContext,
    files: temAnexos ? files : undefined,
  });
  const data = result.data || {};
  const intencaoNormalizada = normalizarIntencao(data.intencao, data.dados);
  return {
    intencao: intencaoNormalizada || "desconhecida",
    plano_resumo: data.plano_resumo || "Não consegui montar um plano para esse comando.",
    confianca: data.confianca ?? 0.5,
    precisa_esclarecimento: !!data.precisa_esclarecimento,
    pergunta_esclarecimento: data.pergunta_esclarecimento || "",
    modulo_afetado: data.modulo_afetado || "cadastros",
    rascunho: !!data.rascunho,
    motivo_rascunho: data.motivo_rascunho || "",
    dados_incompletos: !!data.dados_incompletos,
    dados: data.dados || {},
    modelo_usado: result.model,
    raw: data,
  };
}

// ----- Helpers de execução ------------------------------------------------

function dataIso(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function resolverFornecedor({ id, nome }) {
  if (id) return id;
  if (!nome) return null;
  const lista = await base44.entities.Fornecedor.filter({ nome }).catch(() => []);
  if (lista[0]) return lista[0].id;
  const novo = await base44.entities.Fornecedor.create({ nome });
  return novo.id;
}

async function resolverCategoria({ id, nome, tipo }) {
  if (id) return id;
  if (!nome) return null;
  const lista = await base44.entities.CategoriaFinanceira.filter({ nome }).catch(() => []);
  if (lista[0]) return lista[0].id;
  const nova = await base44.entities.CategoriaFinanceira.create({
    nome,
    tipo: tipo === "receita" ? "entrada" : "saida",
  });
  return nova.id;
}

// ----- Execução real ------------------------------------------------------

export async function executarPlano({ plano, comando, usuario }) {
  const d = plano.dados || {};
  const log = [];
  const stamp = (m) => log.push(`[${new Date().toISOString()}] ${m}`);
  const criados = [];

  let registro_entidade = null;
  let registro = null;

  switch (plano.intencao) {
    // -------- FINANCEIRO --------
    case "criar_conta_pagar": {
      registro_entidade = "ContaPagar";
      const fornecedor_id = await resolverFornecedor({ id: d.fornecedor_id, nome: d.fornecedor_nome });
      const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "despesa" });
      registro = await base44.entities.ContaPagar.create({
        descricao: d.descricao || comando.slice(0, 80),
        valor: Number(d.valor) || 0,
        data_vencimento: dataIso(d.vencimento_iso),
        loja_id: d.loja_id || undefined,
        fornecedor_id: fornecedor_id || undefined,
        categoria_id: categoria_id || undefined,
        centro_custo_id: d.centro_custo_id || undefined,
        observacoes: d.observacoes,
        status: "aberta",
      });
      criados.push({ entidade: "ContaPagar", id: registro.id, descricao: registro.descricao });
      stamp(`ContaPagar criada (id ${registro.id}) — R$ ${registro.valor}`);
      break;
    }

    case "criar_conta_receber": {
      registro_entidade = "ContaReceber";
      const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "receita" });
      registro = await base44.entities.ContaReceber.create({
        descricao: d.descricao || comando.slice(0, 80),
        cliente: d.cliente_nome,
        valor: Number(d.valor) || 0,
        data_vencimento: dataIso(d.vencimento_iso),
        loja_id: d.loja_id || undefined,
        categoria_id: categoria_id || undefined,
        centro_custo_id: d.centro_custo_id || undefined,
        observacoes: d.observacoes,
        status: "aberta",
      });
      criados.push({ entidade: "ContaReceber", id: registro.id, descricao: registro.descricao });
      stamp(`ContaReceber criada (id ${registro.id}) — R$ ${registro.valor}`);
      break;
    }

    case "criar_parcelas_pagar": {
      registro_entidade = "ContaPagar";
      const fornecedor_id = await resolverFornecedor({ id: d.fornecedor_id, nome: d.fornecedor_nome });
      const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "despesa" });
      const parcelas = Array.isArray(d.parcelas) ? d.parcelas : [];
      for (const p of parcelas) {
        const r = await base44.entities.ContaPagar.create({
          descricao: `${d.descricao || comando.slice(0, 60)} — parcela ${p.numero || ""}`.trim(),
          valor: Number(p.valor) || 0,
          data_vencimento: dataIso(p.vencimento_iso),
          loja_id: d.loja_id || undefined,
          fornecedor_id: fornecedor_id || undefined,
          categoria_id: categoria_id || undefined,
          status: "aberta",
        });
        criados.push({ entidade: "ContaPagar", id: r.id, descricao: r.descricao });
      }
      registro = criados[0]?.id ? { id: criados[0].id } : null;
      stamp(`Criadas ${criados.length} parcelas de ContaPagar.`);
      break;
    }

    case "criar_parcelas_receber": {
      registro_entidade = "ContaReceber";
      const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "receita" });
      const parcelas = Array.isArray(d.parcelas) ? d.parcelas : [];
      for (const p of parcelas) {
        const r = await base44.entities.ContaReceber.create({
          descricao: `${d.descricao || comando.slice(0, 60)} — parcela ${p.numero || ""}`.trim(),
          cliente: d.cliente_nome,
          valor: Number(p.valor) || 0,
          data_vencimento: dataIso(p.vencimento_iso),
          loja_id: d.loja_id || undefined,
          categoria_id: categoria_id || undefined,
          status: "aberta",
        });
        criados.push({ entidade: "ContaReceber", id: r.id, descricao: r.descricao });
      }
      registro = criados[0] ? { id: criados[0].id } : null;
      stamp(`Criadas ${criados.length} parcelas de ContaReceber.`);
      break;
    }

    // -------- CADASTROS --------
    case "criar_fornecedor": {
      registro_entidade = "Fornecedor";
      registro = await base44.entities.Fornecedor.create({
        nome: d.nome || d.fornecedor_nome || comando.slice(0, 80),
        cnpj_cpf: d.cnpj_cpf,
        telefone: d.telefone,
        email: d.email,
        endereco: d.endereco,
      });
      criados.push({ entidade: "Fornecedor", id: registro.id, descricao: registro.nome });
      stamp(`Fornecedor criado (id ${registro.id})`);
      break;
    }

    case "criar_cliente": {
      registro_entidade = "Cliente";
      registro = await base44.entities.Cliente.create({
        nome: d.nome || d.cliente_nome || comando.slice(0, 80),
        documento: d.cnpj_cpf || d.cliente_documento,
        telefone: d.telefone,
        email: d.email,
        endereco: d.endereco,
      });
      criados.push({ entidade: "Cliente", id: registro.id, descricao: registro.nome });
      stamp(`Cliente criado (id ${registro.id})`);
      break;
    }

    case "criar_categoria": {
      registro_entidade = "CategoriaFinanceira";
      registro = await base44.entities.CategoriaFinanceira.create({
        nome: d.nome || d.categoria_nome || comando.slice(0, 80),
        tipo: d.categoria_tipo_dre === "receita" ? "entrada" : "saida",
        grupo: d.categoria_grupo,
      });
      criados.push({ entidade: "CategoriaFinanceira", id: registro.id, descricao: registro.nome });
      stamp(`CategoriaFinanceira criada (id ${registro.id})`);
      break;
    }

    case "criar_centro_custo": {
      registro_entidade = "CentroCusto";
      registro = await base44.entities.CentroCusto.create({
        nome: d.nome || comando.slice(0, 80),
        loja_id: d.loja_id || undefined,
      });
      criados.push({ entidade: "CentroCusto", id: registro.id, descricao: registro.nome });
      stamp(`CentroCusto criado (id ${registro.id})`);
      break;
    }

    case "criar_item":
    case "criar_itens_lote": {
      const itens = plano.intencao === "criar_item"
        ? [{
            nome: d.nome,
            grupo: d.grupo || "insumo",
            tipo_detalhado: d.tipo_detalhado || "insumo_producao",
            categoria: d.categoria,
            unidade_medida: d.unidade_medida,
            entra_ficha_tecnica: d.entra_ficha_tecnica,
            entra_cmv: d.entra_cmv,
            impacta_dre: d.impacta_dre,
            grupo_dre_sugerido: d.grupo_dre_sugerido,
          }]
        : (Array.isArray(d.itens) ? d.itens : []);

      for (const it of itens) {
        const grupo = it.grupo === "produto" ? "produto" : "insumo";
        const Entity = grupo === "produto" ? base44.entities.Produto : base44.entities.Insumo;
        const payload = {
          nome: it.nome,
          tipo_detalhado: it.tipo_detalhado,
          categoria: it.categoria,
          subcategoria: it.subcategoria,
          unidade_medida: it.unidade_medida,
          entra_ficha_tecnica: it.entra_ficha_tecnica ?? (grupo === "insumo"),
          entra_cmv: it.entra_cmv ?? true,
          impacta_dre: it.impacta_dre ?? true,
          grupo_dre_sugerido: it.grupo_dre_sugerido,
          estoque_minimo: it.estoque_minimo,
          custo_referencia: it.custo_referencia,
          origem_cadastro: "ia",
          motivo_revisao: it.motivo_revisao,
          prioridade_revisao: it.motivo_revisao ? "media" : "ok",
          ativo: true,
        };
        const r = await Entity.create(payload);
        criados.push({ entidade: grupo === "produto" ? "Produto" : "Insumo", id: r.id, descricao: r.nome });
      }
      registro_entidade = criados[0]?.entidade || "Insumo";
      registro = criados[0] ? { id: criados[0].id } : null;
      stamp(`Criados ${criados.length} itens em lote.`);
      break;
    }

    case "atualizar_item": {
      if (!d.item_alvo_id) throw new Error("Item alvo não identificado.");
      registro_entidade = d.grupo === "produto" ? "Produto" : "Insumo";
      const Entity = d.grupo === "produto" ? base44.entities.Produto : base44.entities.Insumo;
      const update = {};
      if (d.categoria) update.categoria = d.categoria;
      if (d.subcategoria) update.subcategoria = d.subcategoria;
      if (d.unidade_medida) update.unidade_medida = d.unidade_medida;
      if (d.tipo_detalhado) update.tipo_detalhado = d.tipo_detalhado;
      if (typeof d.entra_ficha_tecnica === "boolean") update.entra_ficha_tecnica = d.entra_ficha_tecnica;
      if (typeof d.entra_cmv === "boolean") update.entra_cmv = d.entra_cmv;
      if (typeof d.impacta_dre === "boolean") update.impacta_dre = d.impacta_dre;
      registro = await Entity.update(d.item_alvo_id, update);
      criados.push({ entidade: registro_entidade, id: d.item_alvo_id, descricao: `update ${d.item_alvo_nome || d.item_alvo_id}` });
      stamp(`${registro_entidade} ${d.item_alvo_id} atualizado.`);
      break;
    }

    case "atualizar_estoque_minimo": {
      if (!d.item_alvo_id) throw new Error("Item alvo não identificado.");
      registro_entidade = d.grupo === "produto" ? "Produto" : "Insumo";
      const Entity = d.grupo === "produto" ? base44.entities.Produto : base44.entities.Insumo;
      registro = await Entity.update(d.item_alvo_id, {
        estoque_minimo: Number(d.novo_estoque_minimo) || 0,
        ...(typeof d.novo_estoque_maximo === "number" ? { estoque_maximo: d.novo_estoque_maximo } : {}),
      });
      criados.push({ entidade: registro_entidade, id: d.item_alvo_id, descricao: `estoque mínimo = ${d.novo_estoque_minimo}` });
      stamp(`Estoque mínimo de ${registro_entidade} ${d.item_alvo_id} atualizado.`);
      break;
    }

    // -------- ESTOQUE --------
    case "criar_entrada_estoque":
    case "criar_saldo_inicial": {
      if (!d.item_alvo_id) throw new Error("Item alvo não identificado.");
      if (!d.loja_id) throw new Error("Loja não identificada.");
      registro_entidade = "MovimentacaoEstoque";
      registro = await base44.entities.MovimentacaoEstoque.create({
        tipo: "entrada",
        item_tipo: d.grupo === "produto" ? "produto" : "insumo",
        item_id: d.item_alvo_id,
        item_nome: d.item_alvo_nome,
        quantidade: Number(d.movimentacao_quantidade) || 0,
        loja_id: d.loja_id,
        data: dataIso(new Date().toISOString()),
        motivo: plano.intencao === "criar_saldo_inicial" ? "Saldo inicial" : "Entrada simples (Executor ERP)",
        origem_tipo: "manual",
        usuario_email: usuario?.email,
      });
      criados.push({ entidade: "MovimentacaoEstoque", id: registro.id, descricao: `${d.item_alvo_nome} +${d.movimentacao_quantidade}` });
      stamp(`MovimentacaoEstoque criada (id ${registro.id})`);
      break;
    }

    // -------- COMPRAS --------
    case "criar_compra":
    case "criar_compra_com_itens": {
      registro_entidade = "Compra";
      const fornecedor_id = await resolverFornecedor({ id: d.fornecedor_id, nome: d.fornecedor_nome });
      registro = await base44.entities.Compra.create({
        fornecedor_id: fornecedor_id || undefined,
        loja_id: d.loja_id,
        data: dataIso(d.compra_data_iso) || dataIso(new Date().toISOString()),
        valor_total: Number(d.compra_valor_total) || 0,
        itens: Array.isArray(d.itens) ? d.itens.map((i) => ({
          item_tipo: i.grupo === "produto" ? "produto" : "insumo",
          item_id: i.item_alvo_id || undefined,
          item_nome: i.nome,
          quantidade: Number(i.quantidade) || 0,
          custo_unitario: Number(i.custo_referencia) || 0,
          total: (Number(i.quantidade) || 0) * (Number(i.custo_referencia) || 0),
        })) : [],
        conta_pagar_prevista: !!d.compra_gerar_conta_pagar,
        observacoes: d.observacoes,
        status: "lancada",
      });
      criados.push({ entidade: "Compra", id: registro.id, descricao: `Compra R$ ${registro.valor_total}` });
      stamp(`Compra criada (id ${registro.id})`);

      if (d.compra_gerar_conta_pagar) {
        const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "despesa" });
        const cp = await base44.entities.ContaPagar.create({
          descricao: `Compra ${registro.id}${d.fornecedor_nome ? ` — ${d.fornecedor_nome}` : ""}`,
          valor: Number(d.compra_valor_total) || 0,
          data_vencimento: dataIso(d.compra_vencimento_iso) || dataIso(new Date().toISOString()),
          loja_id: d.loja_id,
          fornecedor_id: fornecedor_id || undefined,
          categoria_id: categoria_id || undefined,
          compra_id: registro.id,
          status: "aberta",
        });
        criados.push({ entidade: "ContaPagar", id: cp.id, descricao: cp.descricao });
        stamp(`ContaPagar gerada a partir da compra (id ${cp.id})`);
      }
      break;
    }

    case "gerar_conta_pagar_compra": {
      if (!d.item_alvo_id) throw new Error("ID da compra não informado.");
      registro_entidade = "ContaPagar";
      const compra = await base44.entities.Compra.get(d.item_alvo_id);
      const categoria_id = await resolverCategoria({ id: d.categoria_id, nome: d.categoria_nome, tipo: "despesa" });
      registro = await base44.entities.ContaPagar.create({
        descricao: `Compra ${compra.id}`,
        valor: Number(compra.valor_total) || 0,
        data_vencimento: dataIso(d.compra_vencimento_iso) || dataIso(new Date().toISOString()),
        loja_id: compra.loja_id,
        fornecedor_id: compra.fornecedor_id,
        categoria_id: categoria_id || undefined,
        compra_id: compra.id,
        status: "aberta",
      });
      criados.push({ entidade: "ContaPagar", id: registro.id, descricao: registro.descricao });
      stamp(`ContaPagar gerada a partir de compra existente (id ${registro.id})`);
      break;
    }

    // -------- CONSULTAS / ORGANIZAÇÃO --------
    case "consultar_contas_pagar":
    case "consultar_contas_receber":
    case "consultar_estoque":
    case "classificar_despesa":
    case "separar_lista_por_tipo":
    case "categorizar_lista":
    case "identificar_duplicidades":
    case "classificar_itens": {
      stamp(`Consulta/análise executada (sem registro persistente).`);
      break;
    }

    default:
      throw new Error(`Intenção não suportada para execução: ${plano.intencao}`);
  }

  return {
    registro_entidade,
    registro_id: registro?.id || null,
    registros_criados: criados,
    log_execucao: log.join("\n"),
    dados_depois: registro ? JSON.stringify(registro) : null,
  };
}