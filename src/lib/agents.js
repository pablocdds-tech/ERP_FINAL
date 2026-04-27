// Estrutura conceitual dos agents do sistema.
// Cada agent representa um domínio de automação/IA; implementação real virá depois.
export const AGENTS = [
  { id: 1, nome: "Orquestrador", descricao: "Coordena a comunicação entre todos os agents." },
  { id: 2, nome: "Cadastros", descricao: "Mantém integridade de produtos, insumos e fornecedores." },
  { id: 3, nome: "Compras e Notas", descricao: "Lê notas fiscais e organiza compras." },
  { id: 4, nome: "Estoque", descricao: "Monitora movimentações, perdas e ajustes." },
  { id: 5, nome: "Produção", descricao: "Acompanha ordens de produção do CD e das lojas." },
  { id: 6, nome: "Vendas e Caixa", descricao: "Processa fechamentos diários e conferência." },
  { id: 7, nome: "Financeiro Real", descricao: "Gerencia banco, contas a pagar e a receber." },
  { id: 8, nome: "Banco Virtual", descricao: "Controla débitos e créditos internos entre lojas." },
  { id: 9, nome: "RH e Ponto", descricao: "Cuida de ponto, escalas e banco de horas." },
  { id: 10, nome: "PWA Funcionário", descricao: "Interface mobile da equipe operacional." },
  { id: 11, nome: "Rotinas Operacionais", descricao: "Executa checklists, tarefas e auditorias." },
  { id: 12, nome: "Manutenção", descricao: "Gerencia OS preventivas e corretivas." },
  { id: 13, nome: "Comunicação Operacional", descricao: "Notifica equipes via canais oficiais." },
  { id: 14, nome: "Marketing e Comercial", descricao: "Campanhas, cupons e recuperação de clientes." },
  { id: 15, nome: "Atendimento e Experiência", descricao: "Tratativas, NPS e histórico de problemas." },
  { id: 16, nome: "BI e Gestão", descricao: "Indicadores, DRE, CMV e margem." },
  { id: 17, nome: "Auditoria e Segurança", descricao: "Logs sensíveis e trilha de auditoria." },
  { id: 18, nome: "Integrações e n8n", descricao: "Webhooks, n8n e integrações externas." },
  { id: 19, nome: "Documentos e Arquivos", descricao: "Gestão de arquivos e contratos." },
  { id: 20, nome: "Planejamento e Previsão", descricao: "Previsão de demanda e planejamento." },
];