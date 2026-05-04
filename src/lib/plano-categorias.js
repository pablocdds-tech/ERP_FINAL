// Plano de Categorias Financeiras — taxonomia + regras de DRE + validações.
// Ponto único de verdade para semear, validar e classificar lançamentos.

export const GRUPOS = [
  "Receitas",
  "Deduções da Receita",
  "CMV",
  "Mão de Obra",
  "Ocupação e Estrutura",
  "Operacional",
  "Manutenção e Equipamentos",
  "Administrativo",
  "Marketing e Comercial",
  "Delivery e Logística",
  "Financeiro",
  "Impostos e Taxas",
  "Investimentos",
  "Sócio x Empresa",
  "Transferências e Movimentos Internos",
  "Recebíveis e Conciliação",
];

export const GRUPOS_DRE = [
  "Receita Bruta",
  "Deduções da Receita",
  "Receita Líquida",
  "CMV",
  "Lucro Bruto",
  "Mão de Obra",
  "Despesas Operacionais",
  "Marketing e Comercial",
  "Delivery e Logística",
  "Despesas Administrativas",
  "Despesas Financeiras",
  "Impostos e Taxas",
  "Resultado Operacional",
  "Investimentos",
  "Movimentos Não Operacionais",
  "Não aplicável",
];

// Catálogo padrão. Cada item gera uma CategoriaFinanceira.
// Campos:
//   nome, codigo (único), grupo, tipo, impacta_dre, grupo_dre, ordem_dre,
//   tipo_dre, natureza_uso, regra_uso?
export const CATALOGO = [
  // ---------- 1. RECEITAS ----------
  ...g("Receitas", "entrada", true, "Receita Bruta", "receita", "operacional", [
    ["REC.CONSOLIDADA", "Receita de vendas — consolidada"],
    ["REC.SALAO", "Receita de vendas — salão"],
    ["REC.DELIVERY", "Receita de vendas — delivery próprio"],
    ["REC.BALCAO", "Receita de vendas — balcão"],
    ["REC.WHATSAPP", "Receita de vendas — WhatsApp"],
    ["REC.IFOOD", "Receita de vendas — iFood"],
    ["REC.EVENTOS", "Receita de vendas — encomendas/eventos"],
    ["REC.CARTAO_CRED", "Receita de vendas — cartão crédito consolidado"],
    ["REC.CARTAO_DEB", "Receita de vendas — cartão débito consolidado"],
    ["REC.PIX", "Receita de vendas — Pix consolidado"],
    ["REC.DINHEIRO", "Receita de vendas — dinheiro"],
    ["REC.TX_ENTREGA", "Taxa de entrega cobrada"],
    ["REC.OUTRAS_OP", "Outras receitas operacionais"],
  ], "Use no fechamento diário. NÃO lance receita de novo quando o dinheiro cair no banco."),

  // ---------- 2. DEDUÇÕES ----------
  ...g("Deduções da Receita", "saida", true, "Deduções da Receita", "deducao", "deducao_receita", [
    ["DED.IFOOD", "Taxa iFood"],
    ["DED.MARKETPLACE", "Comissão marketplace"],
    ["DED.TX_CARTAO_C", "Taxa cartão crédito"],
    ["DED.TX_CARTAO_D", "Taxa cartão débito"],
    ["DED.TX_PIX", "Taxa Pix"],
    ["DED.DESCONTOS", "Descontos concedidos"],
    ["DED.CUPONS", "Cupons promocionais"],
    ["DED.CORTESIAS", "Cortesias comerciais"],
    ["DED.CANCELAMENTOS", "Cancelamentos"],
    ["DED.REEMBOLSOS", "Reembolsos de pedidos"],
    ["DED.ANTECIPACAO", "Taxa de antecipação de recebíveis"],
  ], "Reduzem a Receita Bruta para chegar à Receita Líquida."),

  // ---------- 3. CMV ----------
  ...g("CMV", "saida", true, "CMV", "custo", "operacional", [
    ["CMV.FARINHA", "Farinha"],
    ["CMV.MUSSARELA", "Muçarela"],
    ["CMV.CALABRESA", "Calabresa"],
    ["CMV.CATUPIRY", "Catupiry/requeijão"],
    ["CMV.FRANGO", "Frango"],
    ["CMV.CARNES", "Carnes"],
    ["CMV.MOLHOS", "Molhos"],
    ["CMV.HORTIFRUTI", "Hortifruti"],
    ["CMV.TEMPEROS", "Temperos"],
    ["CMV.BEBIDAS", "Bebidas para revenda"],
    ["CMV.SOBREMESAS", "Sobremesas"],
    ["CMV.ACAI", "Açaí/cremes"],
    ["CMV.HAMBURGUER", "Insumos de hambúrguer"],
    ["CMV.EMB_DIRETAS", "Embalagens diretas"],
    ["CMV.CX_PIZZA", "Caixa de pizza"],
    ["CMV.SACO_KRAFT", "Saco kraft"],
    ["CMV.POTES", "Potes e embalagens delivery"],
    ["CMV.SACOLAS", "Sacolas"],
    ["CMV.TALHERES", "Talheres/guardanapos"],
    ["CMV.ETIQUETAS", "Etiquetas"],
    ["CMV.PERDA_INSUMO", "Perda de insumo"],
    ["CMV.PERDA_PA", "Perda de produto acabado"],
    ["CMV.VENCIMENTO", "Vencimento"],
    ["CMV.QUEBRA", "Quebra de estoque"],
    ["CMV.ERRO_PROD", "Erro de produção"],
  ]),

  // ---------- 4. MÃO DE OBRA ----------
  ...g("Mão de Obra", "saida", true, "Mão de Obra", "despesa", "operacional", [
    ["MO.SALARIOS", "Salários"],
    ["MO.PROLABORE", "Pró-labore"],
    ["MO.HORAS_EXTRAS", "Horas extras"],
    ["MO.COMISSOES", "Comissões"],
    ["MO.DIARIAS", "Diárias"],
    ["MO.FREELANCERS", "Freelancers"],
    ["MO.MOTOBOY_FIXO", "Motoboys fixos"],
    ["MO.INSS_FGTS", "INSS/FGTS"],
    ["MO.FERIAS", "Férias"],
    ["MO.13", "13º salário"],
    ["MO.VT", "Vale transporte"],
    ["MO.VR", "Vale alimentação/refeição"],
    ["MO.BENEFICIOS", "Benefícios"],
    ["MO.UNIFORMES", "Uniformes"],
    ["MO.RESCISOES", "Rescisões"],
    ["MO.ACORDOS", "Acordos trabalhistas"],
    ["MO.PROCESSOS", "Custas/processos trabalhistas"],
  ]),

  // ---------- 5. OCUPAÇÃO ----------
  ...g("Ocupação e Estrutura", "saida", true, "Despesas Operacionais", "despesa", "operacional", [
    ["OC.ALUGUEL", "Aluguel"],
    ["OC.CONDOMINIO", "Condomínio"],
    ["OC.IPTU", "IPTU"],
    ["OC.ENERGIA", "Energia elétrica"],
    ["OC.AGUA", "Água"],
    ["OC.GAS", "Gás"],
    ["OC.INTERNET", "Internet"],
    ["OC.TELEFONE", "Telefone"],
    ["OC.SEGURANCA", "Segurança/monitoramento"],
    ["OC.DEDETIZACAO", "Dedetização"],
    ["OC.LIMPEZA_IMOVEL", "Limpeza do imóvel"],
    ["OC.MANUT_PREDIAL", "Manutenção predial"],
    ["OC.PEQUENAS_REFORMAS", "Pequenas reformas"],
  ]),

  // ---------- 6. OPERACIONAL ----------
  ...g("Operacional", "saida", true, "Despesas Operacionais", "despesa", "operacional", [
    ["OP.LIMPEZA", "Material de limpeza"],
    ["OP.DESCARTAVEL", "Material descartável operacional"],
    ["OP.UTENSILIOS", "Utensílios de cozinha"],
    ["OP.EPI", "EPIs"],
    ["OP.GELO", "Gelo"],
    ["OP.LAVANDERIA", "Lavanderia"],
    ["OP.FRETE_COMPRA", "Fretes de compra"],
    ["OP.TRANSPORTE_OP", "Transporte operacional"],
    ["OP.COMBUSTIVEL", "Combustível operacional"],
    ["OP.ESTACIONAMENTO", "Estacionamento/pedágio operacional"],
    ["OP.PEQUENAS_COMPRAS", "Pequenas compras operacionais"],
    ["OP.EMERGENCIAIS", "Despesas emergenciais de loja"],
  ]),

  // ---------- 7. MANUTENÇÃO ----------
  ...g("Manutenção e Equipamentos", "saida", true, "Despesas Operacionais", "despesa", "operacional", [
    ["MAN.FORNO", "Manutenção de forno"],
    ["MAN.GELADEIRA", "Manutenção de geladeira/câmara fria"],
    ["MAN.FREEZER", "Manutenção de freezer"],
    ["MAN.AR", "Manutenção de ar-condicionado"],
    ["MAN.ELETRICA", "Manutenção elétrica"],
    ["MAN.HIDRAULICA", "Manutenção hidráulica"],
    ["MAN.COIFA", "Manutenção de coifa/exaustão"],
    ["MAN.PECAS", "Peças e reposições"],
    ["MAN.ALUGUEL_EQ", "Aluguel de equipamentos"],
  ]),
  // Compra de equipamento → vai para Investimentos
  one("MAN.COMPRA_EQ", "Compra de equipamentos", "Manutenção e Equipamentos", "saida", false, "Investimentos", "investimento", "investimento",
    "Compra de equipamento durável NÃO entra na DRE operacional. Aparece em Investimentos."),

  // ---------- 8. ADMINISTRATIVO ----------
  ...g("Administrativo", "saida", true, "Despesas Administrativas", "despesa", "operacional", [
    ["ADM.CONTABIL", "Contabilidade"],
    ["ADM.ERP", "Sistema/ERP"],
    ["ADM.CERT_DIGITAL", "Certificado digital"],
    ["ADM.CARTORIO", "Cartório"],
    ["ADM.ESCRITORIO", "Material de escritório"],
    ["ADM.CONSULTORIA", "Consultorias"],
    ["ADM.HONORARIOS", "Honorários administrativos"],
    ["ADM.BANCARIAS", "Despesas bancárias administrativas"],
    ["ADM.SOFTWARE", "Assinaturas de software"],
    ["ADM.TREINAMENTOS", "Treinamentos administrativos"],
  ]),

  // ---------- 9. MARKETING ----------
  ...g("Marketing e Comercial", "saida", true, "Marketing e Comercial", "despesa", "operacional", [
    ["MKT.TRAFEGO", "Tráfego pago"],
    ["MKT.INFLUENCERS", "Influenciadores"],
    ["MKT.CONTEUDO", "Produção de conteúdo"],
    ["MKT.SOCIAL_MEDIA", "Designer/social media"],
    ["MKT.FOTO_VIDEO", "Fotografia/vídeo"],
    ["MKT.BRINDES", "Brindes"],
    ["MKT.GRAFICO", "Material gráfico"],
    ["MKT.PANFLETAGEM", "Panfletagem"],
    ["MKT.ACOES", "Ações comerciais"],
    ["MKT.CRM", "WhatsApp/CRM/Manychat"],
    ["MKT.PLATAFORMA", "Taxas de plataforma de marketing"],
  ], "Gasto para divulgar fica aqui. Desconto/cupom de venda fica em Deduções."),

  // ---------- 10. DELIVERY ----------
  ...g("Delivery e Logística", "saida", true, "Delivery e Logística", "despesa", "operacional", [
    ["DEL.MOTOBOY_AVULSO", "Motoboys avulsos"],
    ["DEL.TX_ENTREGA_SUB", "Taxa de entrega subsidiada"],
    ["DEL.COMBUSTIVEL", "Ajuda combustível"],
    ["DEL.MANUT_BAG", "Manutenção de bag"],
    ["DEL.COMPRA_BAG", "Compra de bag"],
    ["DEL.RASTREAMENTO", "Rastreamento/app de entrega"],
    ["DEL.TERCEIRIZADO", "Terceirização de entrega"],
    ["DEL.REENTREGA", "Reentrega por erro"],
    ["DEL.GRATIS", "Custo de entrega grátis"],
  ]),

  // ---------- 11. FINANCEIRO ----------
  ...g("Financeiro", "saida", true, "Despesas Financeiras", "despesa", "operacional", [
    ["FIN.JUROS", "Juros bancários"],
    ["FIN.CHEQUE_ESP_PJ", "Juros cheque especial PJ"],
    ["FIN.CHEQUE_ESP_PF", "Juros cheque especial PF usado pela empresa"],
    ["FIN.MULTAS", "Multas por atraso"],
    ["FIN.IOF", "IOF"],
    ["FIN.TARIFAS", "Tarifas bancárias"],
    ["FIN.TX_EMPRESTIMO", "Taxas de empréstimo"],
    ["FIN.JUROS_CARTAO", "Juros cartão de crédito"],
    ["FIN.ANTECIPACAO", "Antecipação de recebíveis"],
    ["FIN.DESC_CONCEDIDO", "Descontos financeiros concedidos"],
    ["FIN.RENEGOCIACAO", "Renegociação de dívidas"],
  ]),

  // ---------- 12. IMPOSTOS ----------
  ...g("Impostos e Taxas", "saida", true, "Impostos e Taxas", "despesa", "operacional", [
    ["IMP.DAS", "DAS Simples Nacional"],
    ["IMP.TX_MUNI", "Taxas municipais"],
    ["IMP.ALVARAS", "Alvarás"],
    ["IMP.LICENCAS", "Licenças"],
    ["IMP.VIG_SAN", "Vigilância sanitária"],
    ["IMP.BOMBEIROS", "Corpo de bombeiros"],
    ["IMP.DIVERSAS", "Taxas diversas"],
    ["IMP.PARCELAMENTOS", "Parcelamentos fiscais"],
  ]),

  // ---------- 13. INVESTIMENTOS ----------
  ...g("Investimentos", "saida", false, "Investimentos", "investimento", "investimento", [
    ["INV.EQUIPAMENTO", "Compra de equipamento"],
    ["INV.REFORMA", "Reforma estrutural"],
    ["INV.MOBILIARIO", "Mobiliário"],
    ["INV.TECNOLOGIA", "Tecnologia"],
    ["INV.SISTEMA_DEV", "Desenvolvimento de sistema"],
    ["INV.OBRA", "Projeto/obra"],
    ["INV.BENFEITORIAS", "Benfeitorias"],
  ], "Aparece em relatório separado de investimentos. NÃO entra na DRE operacional."),

  // ---------- 14. SÓCIO X EMPRESA ----------
  // Despesa da empresa paga pela PF → entra na DRE como despesa
  one("SOC.DESP_EMP_PF", "Despesa da empresa paga pela PF", "Sócio x Empresa", "saida", true, "Despesas Operacionais", "despesa", "socio_empresa",
    "Empresa precisa registrar a despesa, mas o pagamento saiu do bolso do sócio."),
  // Juros PF causados pela empresa → despesa financeira
  one("SOC.JUROS_PF", "Juros PF causados pela empresa", "Sócio x Empresa", "saida", true, "Despesas Financeiras", "despesa", "socio_empresa",
    "Juros de cheque/cartão PF causados por uso da empresa entram como despesa financeira."),
  // Não impactam DRE operacional
  one("SOC.APORTE", "Aporte do sócio", "Sócio x Empresa", "entrada", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Aporte NÃO é receita. Aumenta o crédito do sócio com a empresa."),
  one("SOC.EMPRESTIMO", "Empréstimo do sócio", "Sócio x Empresa", "entrada", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Empréstimo NÃO é receita."),
  one("SOC.USO_CHEQUE_PF", "Uso de cheque especial PF pela empresa", "Sócio x Empresa", "saida", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "O principal não é despesa. Os juros vão em SOC.JUROS_PF."),
  one("SOC.DESP_PESS_EMP", "Despesa pessoal paga pela empresa", "Sócio x Empresa", "saida", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "NÃO é despesa operacional. Vira a receber contra o sócio."),
  one("SOC.RECEB_EMP_PF", "Recebimento da empresa em conta PF", "Sócio x Empresa", "entrada", true, "Receita Bruta", "receita", "socio_empresa",
    "Use só se a venda ainda não foi registrada no fechamento, para não duplicar receita."),
  one("SOC.RETIRADA", "Retirada do sócio", "Sócio x Empresa", "saida", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "NÃO é despesa operacional."),
  one("SOC.CARTAO_PESSOAL", "Cartão pessoal pago pela empresa", "Sócio x Empresa", "saida", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Vira a receber contra o sócio. NÃO é despesa operacional."),
  one("SOC.VENDA_PIX_PF", "Venda recebida no Pix PF", "Sócio x Empresa", "entrada", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Se a venda já foi registrada no fechamento, NÃO duplique receita aqui."),
  one("SOC.REEMBOLSO", "Reembolso ao sócio", "Sócio x Empresa", "saida", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Reduz a dívida com o sócio. NÃO é despesa."),
  one("SOC.DEVOLUCAO", "Devolução do sócio para empresa", "Sócio x Empresa", "entrada", false, "Movimentos Não Operacionais", "nao_operacional", "socio_empresa",
    "Reduz dívida do sócio. NÃO é receita."),
  one("SOC.COMPENSACAO", "Compensação mensal", "Sócio x Empresa", "ajuste", false, "Movimentos Não Operacionais", "nao_operacional", "ajuste"),
  one("SOC.ACERTO", "Acerto de saldo", "Sócio x Empresa", "ajuste", false, "Movimentos Não Operacionais", "nao_operacional", "ajuste"),

  // ---------- 15. TRANSFERÊNCIAS ----------
  ...g("Transferências e Movimentos Internos", "interno", false, "Não aplicável", "nao_aplicavel", "transferencia_interna", [
    ["TRF.ENTRE_CONTAS", "Transferência entre contas bancárias"],
    ["TRF.CAIXA_BANCO", "Transferência caixa para banco"],
    ["TRF.BANCO_CAIXA", "Transferência banco para caixa"],
    ["TRF.REPASSE_LOJAS", "Repasse entre lojas"],
    ["TRF.LIQ_VIRTUAL", "Liquidação Banco Virtual CD/Lojas"],
    ["TRF.ACERTO", "Acerto interno"],
    ["TRF.PF_PJ", "Movimentação entre contas PF/PJ"],
  ], "Transferência NÃO é receita nem despesa. Não entra na DRE."),

  // ---------- 16. RECEBÍVEIS / CONCILIAÇÃO ----------
  ...g("Recebíveis e Conciliação", "interno", false, "Não aplicável", "nao_aplicavel", "baixa_recebivel", [
    ["RCB.CARTAO_CRED", "Baixa de recebível cartão crédito"],
    ["RCB.CARTAO_DEB", "Baixa de recebível cartão débito"],
    ["RCB.PIX_MAQ", "Baixa de recebível Pix maquininha"],
    ["RCB.IFOOD", "Baixa de recebível iFood"],
    ["RCB.CONCILIACAO", "Conciliação de maquininha"],
    ["RCB.DIF_TAXA", "Diferença de taxa de maquininha"],
    ["RCB.NAO_IDENT", "Recebimento consolidado não identificado"],
  ], "Use quando o dinheiro CAI no banco. Não duplica receita — a venda já nasceu no fechamento diário."),
];

// Helpers internos do catálogo
function g(grupo, tipo, impacta_dre, grupo_dre, tipo_dre, natureza_uso, items, regra) {
  return items.map(([codigo, nome], i) => ({
    codigo, nome, grupo, tipo, impacta_dre, grupo_dre, tipo_dre, natureza_uso,
    ordem_dre: i, regra_uso: regra, sistema: true, ativo: true,
  }));
}
function one(codigo, nome, grupo, tipo, impacta_dre, grupo_dre, tipo_dre, natureza_uso, regra) {
  return { codigo, nome, grupo, tipo, impacta_dre, grupo_dre, tipo_dre, natureza_uso, regra_uso: regra, sistema: true, ativo: true };
}

// ---------- VALIDAÇÕES ----------
//
// validarLancamento({ categoria, tipo_origem, contexto })
//   tipo_origem: 'venda' | 'baixa_recebivel' | 'movimento_socio' | 'transferencia' | 'lancamento_manual'
//   contexto:    { tem_fechamento_dia?, conta_natureza? }
//
// Retorna { ok, severity:'error'|'warn', mensagem }
export function validarLancamento({ categoria, tipo_origem, contexto = {} }) {
  if (!categoria) return { ok: true };
  const nat = categoria.natureza_uso;

  // 1. Aporte/empréstimo/retirada não podem virar receita/despesa operacional
  if (tipo_origem === "lancamento_manual" && nat === "socio_empresa" && categoria.tipo_dre === "receita" && contexto.tem_fechamento_dia) {
    return { ok: false, severity: "error", mensagem: "Esta venda já foi registrada no fechamento — não duplique receita aqui." };
  }
  // 2. Baixa de recebível não pode virar receita
  if (nat === "baixa_recebivel" && tipo_origem === "venda") {
    return { ok: false, severity: "error", mensagem: "Baixa de recebível NÃO é venda. Use uma categoria de Receita." };
  }
  // 3. Transferência interna não entra na DRE
  if (nat === "transferencia_interna" && tipo_origem === "venda") {
    return { ok: false, severity: "error", mensagem: "Transferência interna NÃO é receita." };
  }
  // 4. Recebimento de maquininha sem definição
  if (categoria.codigo === "RCB.NAO_IDENT") {
    return { ok: true, severity: "warn", mensagem: "Lançado como 'não identificado'. Tente vincular a um fechamento ou recebível depois." };
  }
  // 5. Banco virtual misturando com financeiro real
  if (contexto.conta_natureza === "VIRTUAL_INTERNO" && categoria.impacta_dre) {
    return { ok: false, severity: "error", mensagem: "Conta de Banco Virtual não pode lançar em categoria que afeta a DRE." };
  }
  return { ok: true };
}