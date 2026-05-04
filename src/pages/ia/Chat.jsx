import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Trash2 } from "lucide-react";
import PageShell from "@/components/ia/PageShell";
import AgentPicker from "@/components/ia/chat/AgentPicker";
import ModelPicker from "@/components/ia/chat/ModelPicker";
import ChatMessage from "@/components/ia/chat/ChatMessage";
import PlanoCard from "@/components/ia/chat/PlanoCard";
import { askAI } from "@/lib/ai-provider";
import { logInteracao } from "@/lib/ai-log";
import { getAgent } from "@/lib/agents-config";
import { base44 } from "@/api/base44Client";
import { criarComando, confirmarComando, cancelarComando } from "@/lib/executor-comando-service";
import { toast } from "sonner";

export default function Chat() {
  const [agentChave, setAgentChave] = useState("orquestrador");
  const [modelo, setModelo] = useState("automatic");
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acaoLoading, setAcaoLoading] = useState(null);
  const scrollRef = useRef(null);

  const agent = getAgent(agentChave);
  const isExecutor = !!agent?.modoExecutor;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, loading]);

  const enviar = async () => {
    const pergunta = input.trim();
    if (!pergunta || loading) return;
    setInput("");
    setMensagens((m) => [...m, { role: "user", content: pergunta }]);
    setLoading(true);
    const t0 = Date.now();

    // Modo Executor: interpreta como comando estruturado e exibe plano
    if (isExecutor) {
      try {
        const usuario = await base44.auth.me().catch(() => null);
        const { comando } = await criarComando({ comando: pergunta, modelo, usuario });
        setMensagens((m) => [...m, { role: "assistant", tipo: "plano", comando }]);
      } catch (e) {
        const erro = e?.message || "Falha ao interpretar comando";
        setMensagens((m) => [...m, { role: "assistant", content: `⚠️ ${erro}`, modelo }]);
        toast.error(erro);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { text, model } = await askAI({
        prompt: pergunta,
        model: modelo,
        systemContext: agent?.papel,
      });
      setMensagens((m) => [...m, { role: "assistant", content: text, modelo: model }]);
      await logInteracao({
        agentChave: agent.chave,
        agentNome: agent.nome,
        modelo: model,
        pergunta,
        resposta: text,
        duracaoMs: Date.now() - t0,
      });
    } catch (e) {
      const erro = e?.message || "Erro ao chamar IA";
      setMensagens((m) => [...m, { role: "assistant", content: `⚠️ ${erro}`, modelo }]);
      await logInteracao({
        agentChave: agent.chave,
        agentNome: agent.nome,
        modelo,
        pergunta,
        resposta: erro,
        status: "erro",
        erroDetalhe: erro,
        duracaoMs: Date.now() - t0,
      });
      toast.error("Falha na consulta à IA");
    } finally {
      setLoading(false);
    }
  };

  const atualizarComandoNaLista = (atualizado) => {
    setMensagens((m) => m.map((msg) =>
      msg.tipo === "plano" && msg.comando.id === atualizado.id ? { ...msg, comando: atualizado } : msg
    ));
  };

  const handleConfirmar = async (id) => {
    setAcaoLoading(id);
    try {
      const out = await confirmarComando({ comandoId: id });
      atualizarComandoNaLista(out);
      toast.success(out.status === "executado" ? "Executado." : "Concluído com erro.");
    } catch (e) {
      toast.error(e?.message || "Falha");
    } finally {
      setAcaoLoading(null);
    }
  };

  const handleCancelarComando = async (id) => {
    setAcaoLoading(id);
    try {
      const out = await cancelarComando({ comandoId: id });
      atualizarComandoNaLista(out);
      toast.success("Cancelado");
    } catch (e) {
      toast.error(e?.message || "Falha");
    } finally {
      setAcaoLoading(null);
    }
  };

  const limpar = () => setMensagens([]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <PageShell
      title="Chat com Agentes"
      description="Converse com os agentes de IA do ERP. Cada interação é registrada em AgentLog."
    >
      <div className="space-y-4">
        <AgentPicker value={agentChave} onChange={(k) => { setAgentChave(k); setMensagens([]); }} />

        <Card className="flex flex-col h-[calc(100vh-340px)] min-h-[420px]">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
            <div className="text-xs text-muted-foreground">
              Conversando com <span className="font-medium text-foreground">{agent?.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <ModelPicker value={modelo} onChange={setModelo} />
              <Button variant="ghost" size="sm" onClick={limpar} disabled={mensagens.length === 0}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">{agent?.nome}</div>
                <div className="max-w-md mx-auto">{agent?.descricao}</div>
                <div className="mt-4 text-xs">Faça uma pergunta para começar.</div>
              </div>
            )}
            {mensagens.map((m, i) => (
              m.tipo === "plano" ? (
                <PlanoCard
                  key={i}
                  comando={m.comando}
                  loading={acaoLoading === m.comando.id}
                  onConfirmar={() => handleConfirmar(m.comando.id)}
                  onCancelar={() => handleCancelarComando(m.comando.id)}
                />
              ) : (
                <ChatMessage key={i} role={m.role} content={m.content} modelo={m.modelo} />
              )
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {agent?.nome} pensando...
              </div>
            )}
          </div>

          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              placeholder={isExecutor
                ? "Digite o que deseja que o Executor faça (ex: Cadastrar conta a pagar de R$ 1.200 do fornecedor Coca-Cola, vencimento dia 10, loja NB)..."
                : `Pergunte algo para ${agent?.nome}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              className="resize-none"
              disabled={loading}
            />
            <Button onClick={enviar} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Os agentes deste release usam o InvokeLLM nativo do Base44. A camada <code>lib/ai-provider.js</code> está
          desacoplada e pode ser trocada por OpenAI/Gemini com chave própria sem alterar as telas.
        </p>
      </div>
    </PageShell>
  );
}