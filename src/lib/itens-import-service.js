// Serviço de classificação e mapeamento da planilha de importação de itens.
// Responsável por:
// - Normalizar o tipo sugerido da planilha → enum interno
// - Decidir se vai para entidade Insumo ou Produto
// - Aplicar regras default (entra ficha técnica, entra CMV, prioridade)
// - Detectar duplicidade por id_externo / nome normalizado

const TIPO_MAP = {
  "insumo de producao": { entidade: "Insumo", tipo_detalhado: "insumo_producao", entra_ficha_tecnica: true, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "insumo de produção": { entidade: "Insumo", tipo_detalhado: "insumo_producao", entra_ficha_tecnica: true, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "embalagem": { entidade: "Insumo", tipo_detalhado: "embalagem", entra_ficha_tecnica: true, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "material operacional": { entidade: "Insumo", tipo_detalhado: "material_operacional", entra_ficha_tecnica: false, entra_cmv: false, grupo_dre_sugerido: "Despesas Operacionais" },
  "produto acabado/semielaborado": { entidade: "Insumo", tipo_detalhado: "produto_acabado_semielaborado", entra_ficha_tecnica: true, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "produto acabado / semielaborado": { entidade: "Insumo", tipo_detalhado: "produto_acabado_semielaborado", entra_ficha_tecnica: true, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "produto de revenda": { entidade: "Produto", tipo_detalhado: "produto_revenda", entra_ficha_tecnica: false, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "produto acabado": { entidade: "Produto", tipo_detalhado: "produto_acabado", entra_ficha_tecnica: false, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "produto acabado/porcionado": { entidade: "Produto", tipo_detalhado: "produto_acabado_porcionado", entra_ficha_tecnica: false, entra_cmv: true, grupo_dre_sugerido: "CMV" },
  "produto acabado / porcionado": { entidade: "Produto", tipo_detalhado: "produto_acabado_porcionado", entra_ficha_tecnica: false, entra_cmv: true, grupo_dre_sugerido: "CMV" },
};

const TIPO_LABEL = {
  insumo_producao: "Insumo de produção",
  embalagem: "Embalagem",
  material_operacional: "Material operacional",
  produto_acabado_semielaborado: "Produto acabado/semielaborado",
  produto_revenda: "Produto de revenda",
  produto_acabado: "Produto acabado",
  produto_acabado_porcionado: "Produto acabado/porcionado",
};

const norm = (s) => String(s || "").trim().toLowerCase();

export const getTipoLabel = (tipo) => TIPO_LABEL[tipo] || tipo || "—";

export const classificarTipo = (tipoSugerido) => {
  return TIPO_MAP[norm(tipoSugerido)] || null;
};

const parseSimNao = (v) => {
  const s = norm(v);
  return s === "sim" || s === "s" || s === "yes" || s === "true" || s === "1";
};

const parseNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// Converte uma linha bruta da planilha em registro normalizado para preview/import.
export const parseLinha = (linha, idx) => {
  const get = (k) => linha[k] ?? linha[k.toLowerCase()] ?? "";
  const nome = String(get("Produto") || "").trim();
  const tipoSugerido = String(get("Tipo sugerido ERP") || "").trim();
  const cls = classificarTipo(tipoSugerido);

  const fichaTecnicaPlanilha = get("Entra na ficha técnica?") || get("Ficha técnica?");
  const entraFicha = cls
    ? (fichaTecnicaPlanilha ? parseSimNao(fichaTecnicaPlanilha) : cls.entra_ficha_tecnica)
    : false;

  const custo = parseNum(get("Preço médio")) ?? parseNum(get("Último preço"));
  const quantidade = parseNum(get("Quantidade")) ?? 0;
  const estoqueMinimo = parseNum(get("Estoque mínimo"));

  const prioridadePlan = norm(get("Prioridade"));
  let prioridade = "ok";
  if (prioridadePlan.includes("complet") || prioridadePlan.includes("revisar")) prioridade = "alta";
  else if (prioridadePlan) prioridade = "media";

  const erros = [];
  if (!nome) erros.push("Nome vazio");
  if (!cls) erros.push(`Tipo "${tipoSugerido}" não reconhecido`);
  if (!get("Unidade")) erros.push("Unidade vazia");
  if (custo === null) erros.push("Custo de referência vazio");
  else if (custo < 0) erros.push("Custo negativo");
  if (quantidade < 0) erros.push("Quantidade negativa");

  return {
    linha: idx + 2, // +2 por causa do header
    nome,
    id_externo: get("ID") ? String(get("ID")) : "",
    unidade: String(get("Unidade") || "").trim(),
    quantidade,
    estoque_minimo: estoqueMinimo,
    custo_referencia: custo,
    categoria: String(get("Categoria sugerida ERP") || get("Categorias") || "").trim(),
    tipo_sugerido: tipoSugerido,
    entidade: cls?.entidade || null,
    tipo_detalhado: cls?.tipo_detalhado || null,
    tipo_label: cls ? TIPO_LABEL[cls.tipo_detalhado] : tipoSugerido,
    entra_ficha_tecnica: entraFicha,
    entra_cmv: cls?.entra_cmv ?? false,
    grupo_dre_sugerido: cls?.grupo_dre_sugerido || "",
    impacto_gerencial: String(get("Impacto gerencial") || "").trim(),
    prioridade_revisao: prioridade,
    motivo_revisao: String(get("Prioridade") || "").trim(),
    observacoes: String(get("Observações") || "").trim(),
    erros,
    valido: erros.length === 0,
  };
};

// Constrói o payload final que vai para create/update na entidade.
export const montarPayload = (linha, importacaoId) => {
  const base = {
    nome: linha.nome,
    id_externo: linha.id_externo || undefined,
    categoria: linha.categoria || undefined,
    tipo_detalhado: linha.tipo_detalhado || undefined,
    unidade_medida: linha.unidade || undefined,
    custo_referencia: linha.custo_referencia ?? undefined,
    estoque_minimo: linha.estoque_minimo ?? undefined,
    entra_ficha_tecnica: linha.entra_ficha_tecnica,
    entra_cmv: linha.entra_cmv,
    impacta_dre: true,
    grupo_dre_sugerido: linha.grupo_dre_sugerido || undefined,
    impacto_gerencial: linha.impacto_gerencial || undefined,
    prioridade_revisao: linha.prioridade_revisao,
    motivo_revisao: linha.motivo_revisao || undefined,
    origem_cadastro: "importacao",
    importacao_id: importacaoId,
    observacoes: linha.observacoes || undefined,
    ativo: true,
  };
  return base;
};