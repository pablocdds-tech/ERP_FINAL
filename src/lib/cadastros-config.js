import {
  Store, Users, Shield, Package, Wheat, Truck, Ruler, Tags,
  Building2, CreditCard, Megaphone, Settings2,
} from "lucide-react";

// Configuração declarativa de cada subcadastro do Módulo 1.
// Mantém todas as telas com o MESMO padrão visual e evita duplicação de páginas.
//
// Cada entrada define:
// - entity: nome da entidade no SDK
// - title / singular: textos exibidos
// - icon
// - hasLoja: 'single' | 'multi' | false  → controla filtro por loja na lista
// - columns: colunas da listagem [{key, label, render?}]
// - searchFields: campos usados na busca textual
// - formComponent: nome do formulário em components/cadastros/forms/

export const CADASTROS = {
  lojas: {
    entity: "Loja",
    title: "Lojas / Unidades",
    singular: "Loja",
    icon: Store,
    hasLoja: false,
    columns: [
      { key: "nome", label: "Nome" },
      { key: "codigo", label: "Código" },
      { key: "tipo", label: "Tipo" },
      { key: "telefone", label: "Telefone" },
    ],
    searchFields: ["nome", "codigo", "endereco"],
    formComponent: "LojaForm",
  },
  usuarios: {
    entity: "User",
    title: "Usuários",
    singular: "Usuário",
    icon: Users,
    hasLoja: "single",
    lojaField: "loja_id",
    readOnly: true, // Usuários são gerenciados via convite. Aqui apenas listagem/edição de role e loja.
    columns: [
      { key: "full_name", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "role", label: "Perfil" },
      { key: "cargo", label: "Cargo" },
    ],
    searchFields: ["full_name", "email", "cargo"],
    formComponent: "UsuarioForm",
  },
  perfis: {
    entity: "Perfil",
    title: "Perfis e Permissões",
    singular: "Perfil",
    icon: Shield,
    hasLoja: false,
    columns: [
      { key: "nome", label: "Nome" },
      { key: "chave", label: "Chave" },
      { key: "descricao", label: "Descrição" },
    ],
    searchFields: ["nome", "chave", "descricao"],
    formComponent: "PerfilForm",
  },
  produtos: {
    entity: "Produto",
    title: "Produtos",
    singular: "Produto",
    icon: Package,
    hasLoja: "multi",
    lojaField: "loja_ids",
    columns: [
      { key: "nome", label: "Nome" },
      { key: "codigo", label: "Código" },
      { key: "categoria", label: "Categoria" },
      { key: "unidade_medida", label: "UM" },
      { key: "preco_venda", label: "Preço", format: "money" },
    ],
    searchFields: ["nome", "codigo", "categoria"],
    formComponent: "ProdutoForm",
  },
  insumos: {
    entity: "Insumo",
    title: "Insumos",
    singular: "Insumo",
    icon: Wheat,
    hasLoja: "multi",
    lojaField: "loja_ids",
    columns: [
      { key: "nome", label: "Nome" },
      { key: "codigo", label: "Código" },
      { key: "categoria", label: "Categoria" },
      { key: "unidade_medida", label: "UM" },
      { key: "custo_referencia", label: "Custo Ref.", format: "money" },
    ],
    searchFields: ["nome", "codigo", "categoria"],
    formComponent: "InsumoForm",
  },
  fornecedores: {
    entity: "Fornecedor",
    title: "Fornecedores",
    singular: "Fornecedor",
    icon: Truck,
    hasLoja: false,
    columns: [
      { key: "nome", label: "Nome" },
      { key: "cnpj_cpf", label: "CNPJ/CPF" },
      { key: "telefone", label: "Telefone" },
      { key: "contato", label: "Contato" },
    ],
    searchFields: ["nome", "razao_social", "cnpj_cpf", "contato"],
    formComponent: "FornecedorForm",
  },
  "unidades-medida": {
    entity: "UnidadeMedida",
    title: "Unidades de Medida",
    singular: "Unidade de Medida",
    icon: Ruler,
    hasLoja: false,
    columns: [
      { key: "sigla", label: "Sigla" },
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Tipo" },
    ],
    searchFields: ["nome", "sigla"],
    formComponent: "UnidadeMedidaForm",
  },
  "categorias-financeiras": {
    entity: "CategoriaFinanceira",
    title: "Categorias Financeiras",
    singular: "Categoria Financeira",
    icon: Tags,
    hasLoja: false,
    columns: [
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Tipo" },
      { key: "grupo", label: "Grupo" },
    ],
    searchFields: ["nome", "grupo"],
    formComponent: "CategoriaFinanceiraForm",
  },
  "centros-custo": {
    entity: "CentroCusto",
    title: "Centros de Custo",
    singular: "Centro de Custo",
    icon: Building2,
    hasLoja: "single",
    lojaField: "loja_id",
    columns: [
      { key: "nome", label: "Nome" },
      { key: "codigo", label: "Código" },
    ],
    searchFields: ["nome", "codigo"],
    formComponent: "CentroCustoForm",
  },
  "formas-pagamento": {
    entity: "FormaPagamento",
    title: "Formas de Pagamento",
    singular: "Forma de Pagamento",
    icon: CreditCard,
    hasLoja: "multi",
    lojaField: "loja_ids",
    columns: [
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Tipo" },
      { key: "taxa_percentual", label: "Taxa %", format: "percent" },
      { key: "prazo_recebimento_dias", label: "Prazo (dias)" },
    ],
    searchFields: ["nome"],
    formComponent: "FormaPagamentoForm",
  },
  "canais-venda": {
    entity: "CanalVenda",
    title: "Canais de Venda",
    singular: "Canal de Venda",
    icon: Megaphone,
    hasLoja: "multi",
    lojaField: "loja_ids",
    columns: [
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Tipo" },
      { key: "taxa_percentual", label: "Taxa %", format: "percent" },
    ],
    searchFields: ["nome"],
    formComponent: "CanalVendaForm",
  },
  "parametros-gerais": {
    entity: "ParametroGeral",
    title: "Parâmetros Gerais",
    singular: "Parâmetro",
    icon: Settings2,
    hasLoja: false,
    columns: [
      { key: "chave", label: "Chave" },
      { key: "valor", label: "Valor" },
      { key: "categoria", label: "Categoria" },
      { key: "descricao", label: "Descrição" },
    ],
    searchFields: ["chave", "valor", "descricao"],
    formComponent: "ParametroGeralForm",
  },
};

export const CADASTROS_LIST = Object.entries(CADASTROS).map(([slug, cfg]) => ({
  slug,
  ...cfg,
}));

export const getCadastro = (slug) => CADASTROS[slug];