import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2, History, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ModelPicker from "@/components/ia/chat/ModelPicker";
import ExecutorChips from "@/components/ia/executor/ExecutorChips";
import ExecutorBubble from "@/components/ia/executor/ExecutorBubble";
import ExecutorPlanoCard from "@/components/ia/executor/ExecutorPlanoCard";
import ExecutorComposer from "@/components/ia/executor/ExecutorComposer";
import { criarComando, confirmarComando, corrigirComando, cancelarComando } from "@/lib/executor-comando-service";

// Detecta intenção de confirmação/cancelamento em frases curtas do usuário.
const RE_CONFIRMAR = /^(ok|okay|confirmar|confirma|confirmado|pode|pode lançar|pode lancar|pode executar|sim|isso|isso mesmo|manda|bora|executar)\b/i;
const RE_CANCELAR = /^(cancelar|cancela|não|nao|deixa|esquece|para|aborta|abortar)\b/i;

export default function ExecutorChat() {
  const [modelo, setModelo] = useState("automatic");
  const [mensagens, setMensagens] = useState([]); // {role, content?, anexos?, tipo?, comandoId?}
  const [comandos, setComandos] = useState({}); // id -> ComandoExecutor
  const [input, setInput] = useState("");
  const [anexos, setAnexos] = useState([]); // {url, name}
  const [enviando, setEnviando] = useState(false);
  const [subindoAnexo, setSubindoAnexo] = useState(false);
  const [acaoLoading, setAcaoLoading] = useState(null);
  const scrollRef = useRef(null);

  // Comando pendente mais recente (aguardando confirmação) — alvo de correção/confirmação.
  const pendente = (() => {
    for (let i = mensagens.length - 1; i >= 0; i--) {
      const m = mensagens[i];
      if (m.tipo === "plano") {
        const c = comandos[m.comandoId];
        if (c && c.status === "aguardando_confirmacao") return c;
        break;
      }
    }
    return null;
  })();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, enviando, acaoLoading]);

  const addAssistant = (content) => setMensagens((m) => [...m, { role: "assistant", content }]);
  const setComando = (c) => setComandos((prev) => ({ ...prev, [c.id]: c }));

  const subirAnexos = async (files) => {
    if (!files.length) return;
    setSubindoAnexo(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAnexos((prev) => [...prev, { url: file_url, name: file.name }]);
      }
    } catch (e) {
      toast.error(e?.message || "Falha ao enviar imagem");
    } finally {
      setSubindoAnexo(false);
    }
  };

  const interpretarNovo = async (texto, urls) => {
    const usuario = await base44.auth.me().catch(() => null);
    const { comando } = await criarComando({ comando: texto, modelo, usuario, files: urls });
    setComando(comando);
    setMensagens((m) => [...m, { role: "assistant", tipo: "plano", comandoId: comando.id }]);
  };

  const enviar = async () => {
    const texto = input.trim();
    const urls = anexos.map((a) => a.url);
    if ((!texto && urls.length === 0) || enviando) return;

    setMensagens((m) => [...m, { role: "user", content: texto, anexos: urls }]);
    setInput("");
    setAnexos([]);
    setEnviando(true);

    try {
      // Sem anexo + comando pendente: pode ser confirmação / cancelamento / correção em linguagem natural.
      if (pendente && urls.length === 0 && texto) {
        if (RE_CONFIRMAR.test(texto)) {
          await executarConfirmacao(pendente.id, true);
          return;
        }
        if (RE_CANCELAR.test(texto)) {
          await executarCancelamento(pendente.id, true);
          return;
        }
        // Caso contrário, trata como correção do plano pendente.
        const atualizado = await corrigirComando({ comandoId: pendente.id, correcao: texto, modelo });
        setComando(atualizado);
        addAssistant("Atualizei a prévia com a sua correção. Confira abaixo e confirme quando estiver certo.");
        setMensagens((m) => [...m, { role: "assistant", tipo: "plano", comandoId: atualizado.id }]);
        return;
      }

      await interpretarNovo(texto, urls);
    } catch (e) {
      addAssistant(`⚠️ ${e?.message || "Falha ao processar."}`);
      toast.error(e?.message || "Falha");
    } finally {
      setEnviando(false);
    }
  };

  const executarConfirmacao = async (id, jaEnviando = false) => {
    if (!jaEnviando) setAcaoLoading(id);
    try {
      const out = await confirmarComando({ comandoId: id });
      setComando(out);
      if (out.status === "executado") {
        const criados = (() => { try { return JSON.parse(out.registros_criados || "[]"); } catch { return []; } })();
        addAssistant(criados.length
          ? `✅ Pronto! Criei no ERP:\n${criados.map((c) => `- ${c.entidade}: ${c.descricao}`).join("\n")}`
          : "✅ Concluído.");
      } else {
        addAssistant("⚠️ Não consegui concluir a execução. Veja o detalhe no card acima.");
      }
    } catch (e) {
      toast.error(e?.message || "Falha");
      addAssistant(`⚠️ ${e?.message || "Falha ao executar."}`);
    } finally {
      if (!jaEnviando) setAcaoLoading(null);
      else setEnviando(false);
    }
  };

  const executarCancelamento = async (id, jaEnviando = false) => {
    if (!jaEnviando) setAcaoLoading(id);
    try {
      const out = await cancelarComando({ comandoId: id });
      setComando(out);
      addAssistant("Operação cancelada. Posso ajudar com outra coisa?");
    } catch (e) {
      toast.error(e?.message || "Falha");
    } finally {
      if (!jaEnviando) setAcaoLoading(null);
      else setEnviando(false);
    }
  };

  const onEditar = () => {
    setInput("Quero ajustar: ");
    toast.message("Descreva o ajuste", { description: 'Ex: "mudar loja para Praça", "vencimento amanhã", "forma de pagamento foi Pix".' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/admin/ia" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="w-3 h-3 mr-1" /> IA e Integrações
      </Link>

      <Card className="flex flex-col h-[calc(100vh-160px)] min-h-[480px] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight">Agente Executor ERP</div>
            <div className="text-[11px] text-muted-foreground leading-tight truncate">
              Envie comandos, cupons, comprovantes ou documentos para o agente analisar e preparar lançamentos.
            </div>
          </div>
          <ModelPicker value={modelo} onChange={setModelo} />
          <Button asChild variant="ghost" size="icon" title="Histórico de comandos">
            <Link to="/admin/ia/comandos"><History className="w-4 h-4" /></Link>
          </Button>
        </div>

        {/* Conversa */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {mensagens.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <Wand2 className="w-6 h-6 text-violet-600" />
              </div>
              <div className="font-medium text-foreground mb-1">Como posso ajudar?</div>
              <p className="max-w-sm mx-auto text-xs">
                Digite um comando ou anexe a foto de um cupom/nota. Eu analiso, mostro uma prévia
                e só executo no ERP depois da sua confirmação.
              </p>
            </div>
          )}

          {mensagens.map((m, i) =>
            m.tipo === "plano" && comandos[m.comandoId] ? (
              <ExecutorPlanoCard
                key={i}
                comando={comandos[m.comandoId]}
                loading={acaoLoading === m.comandoId}
                onConfirmar={() => executarConfirmacao(m.comandoId)}
                onEditar={onEditar}
                onCancelar={() => executarCancelamento(m.comandoId)}
              />
            ) : (
              <ExecutorBubble key={i} role={m.role} content={m.content} anexos={m.anexos} modelo={m.modelo} />
            )
          )}

          {enviando && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...
            </div>
          )}
        </div>

        {/* Chips + Composer */}
        <div className="px-2.5 pt-2 border-t bg-card">
          <ExecutorChips onPick={(p) => setInput(p)} disabled={enviando} />
        </div>
        <ExecutorComposer
          input={input}
          setInput={setInput}
          anexos={anexos}
          onAnexar={subirAnexos}
          onRemoverAnexo={(url) => setAnexos((prev) => prev.filter((a) => a.url !== url))}
          enviando={enviando}
          subindoAnexo={subindoAnexo}
          onEnviar={enviar}
          placeholder={pendente ? "Responda 'ok' para confirmar ou diga o que alterar..." : "Digite um comando ou anexe um documento..."}
        />
      </Card>

      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        O agente cria lançamentos como rascunho e nunca baixa pagamentos, altera saldo bancário ou Banco Virtual automaticamente.
      </p>
    </div>
  );
}