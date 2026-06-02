import {
  Bot, FileText, Activity, Webhook, Workflow, MessageSquare,
  Send, Inbox, AlertOctagon, Settings, MessagesSquare, Wand2,
} from "lucide-react";

// 20 agents previstos
export const AGENTS = [
  { chave: "orquestrador", nome: "Orquestrador", descricao: "Coordena ações entre os outros agents." },
  { chave: "cadastros", nome: "Cadastros", descricao: "Sugere padronização e detecta cadastros duplicados." },
  { chave: "compras_notas", nome: "Compras e Notas", descricao: "Processa NF-e, sugere lançamentos, alerta divergências." },
  { chave: "estoque", nome: "Estoque", descricao: "Monitora estoque mínimo, valida movimentações e perdas." },
  { chave: "producao", nome: "Produção", descricao: "Sugere ordens de produção e calcula consumo de insumos." },
  { chave: "vendas_caixa", nome: "Vendas e Caixa", descricao: "Valida fechamentos, detecta divergências de caixa." },
  { chave: "financeiro_real", nome: "Financeiro Real", descricao: "Concilia movimentações, sugere baixas e categorização." },
  { chave: "banco_virtual", nome: "Banco Virtual", descricao: "Mantém saldos internos e movimentações entre lojas." },
  { chave: "rh_ponto", nome: "RH e Ponto", descricao: "Detecta inconsistências de ponto e atrasos." },
  { chave: "pwa_funcionario", nome: "PWA Funcionário", descricao: "Auxilia execução de checklists e tarefas no app." },
  { chave: "rotinas_op", nome: "Rotinas Operacionais", descricao: "Acompanha tarefas, chamados e ocorrências." },
  { chave: "manutencao", nome: "Manutenção", descricao: "Cria OS preventivas e acompanha equipamentos." },
  { chave: "comunicacao", nome: "Comunicação Operacional", descricao: "Distribui notificações e mensagens internas." },
  { chave: "marketing", nome: "Marketing e Comercial", descricao: "Sugere campanhas e dispara comunicados." },
  { chave: "atendimento", nome: "Atendimento e Experiência", descricao: "Triagem de reclamações e respostas sugeridas." },
  { chave: "bi_gestao", nome: "BI e Gestão", descricao: "Gera insights, alertas e relatórios automáticos." },
  { chave: "auditoria", nome: "Auditoria e Segurança", descricao: "Monitora acessos e detecta padrões anormais." },
  { chave: "integracoes", nome: "Integrações e n8n", descricao: "Orquestra eventos via webhooks e fluxos n8n." },
  { chave: "documentos", nome: "Documentos e Arquivos", descricao: "Organiza e classifica documentos enviados." },
  { chave: "planejamento", nome: "Planejamento e Previsão", descricao: "Projeções de receita, custo e demanda." },
];

export const IA_LIST = [
  { tipo: "chat", nome: "Chat com Agentes", descricao: "Converse com os agentes (Orquestrador, Financeiro, Operações...).", icon: MessagesSquare },
  { tipo: "executor", nome: "Executor ERP (Chat)", descricao: "Chat operacional com IA: envie comandos, cupons, comprovantes e documentos. O agente analisa, mostra a prévia e executa após confirmação.", icon: Wand2 },
  { tipo: "comandos", nome: "Histórico do Executor", descricao: "Todos os comandos enviados ao Executor ERP, com status, plano e registros criados.", icon: FileText },
  { tipo: "agents", nome: "Agents", descricao: "Catálogo dos agents internos da plataforma.", icon: Bot },
  { tipo: "logs", nome: "Logs de Agents", descricao: "Histórico de ações sugeridas e executadas.", icon: FileText },
  { tipo: "eventos", nome: "Eventos de Automação", descricao: "Eventos enviados/recebidos do sistema.", icon: Activity },
  { tipo: "integracoes", nome: "Integrações", descricao: "Webhooks, n8n e WhatsApp configurados.", icon: Webhook },
  { tipo: "n8n", nome: "Fluxos n8n", descricao: "Eventos enviados especificamente para o n8n.", icon: Workflow },
  { tipo: "whatsapp", nome: "Notificações WhatsApp", descricao: "Mensagens disparadas pelo sistema.", icon: MessageSquare },
  { tipo: "fila", nome: "Fila de Mensagens", descricao: "Mensagens pendentes/processando.", icon: Send },
  { tipo: "respostas", nome: "Respostas Recebidas", descricao: "Mensagens recebidas que viraram entidades.", icon: Inbox },
  { tipo: "falhas", nome: "Falhas de Integração", descricao: "Erros de envio e recebimento.", icon: AlertOctagon },
  { tipo: "aprovacoes", nome: "Aprovações Pendentes", descricao: "Ações de IA que aguardam aprovação humana.", icon: Settings },
];

export const STATUS_AGENT = {
  pendente: "bg-slate-100 text-slate-700",
  processando: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  erro: "bg-red-100 text-red-700",
  aguardando_aprovacao: "bg-amber-100 text-amber-700",
};

export const STATUS_EVENTO = {
  pendente: "bg-slate-100 text-slate-700",
  processando: "bg-blue-100 text-blue-700",
  enviado: "bg-emerald-100 text-emerald-700",
  recebido: "bg-violet-100 text-violet-700",
  erro: "bg-red-100 text-red-700",
};