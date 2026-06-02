import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Loader2, ImagePlus, X, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { criarComando } from "@/lib/executor-comando-service";

const EXEMPLOS = [
  "Cadastrar conta a pagar de R$ 1.200 do fornecedor Coca-Cola, vencimento dia 10, loja NB",
  "Cadastrar como insumos: farinha, muçarela, calabresa, frango e catupiry",
  "Cadastrar caixa de pizza G, M e P como embalagens",
  "Criar fornecedor Atacadão",
];

export default function ComandoRapidoOperacional() {
  const [comando, setComando] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [anexos, setAnexos] = useState([]); // [{ url, name }]
  const inputFileRef = useRef(null);
  const navigate = useNavigate();

  const podeEnviar = (comando.trim() || anexos.length > 0) && !loading && !enviandoFoto;

  const onSelecionarFotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setEnviandoFoto(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAnexos((prev) => [...prev, { url: file_url, name: file.name }]);
      }
    } catch (err) {
      toast.error(err?.message || "Falha ao enviar foto");
    } finally {
      setEnviandoFoto(false);
    }
  };

  const removerAnexo = (url) => setAnexos((prev) => prev.filter((a) => a.url !== url));

  const enviar = async () => {
    if (!podeEnviar) return;
    setLoading(true);
    try {
      const usuario = await base44.auth.me().catch(() => null);
      const { comando: registro } = await criarComando({
        comando: comando.trim(),
        modelo: "automatic",
        usuario,
        files: anexos.map((a) => a.url),
      });
      toast.success("Comando interpretado.");
      navigate(`/admin/ia/executor?focus=${registro.id}`);
    } catch (e) {
      toast.error(e?.message || "Falha ao interpretar comando");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-6 border-violet-200 bg-violet-50/30">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-semibold">Executor ERP — comando rápido</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-violet-700 hover:bg-violet-100"
          onClick={() => navigate("/admin/ia/executor")}
        >
          <MessageSquare className="w-4 h-4 mr-1" /> Abrir chat
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Digite o que deseja, ou anexe a foto de um cupom fiscal..."
          value={comando}
          onChange={(e) => setComando(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          disabled={loading}
        />
        <input
          ref={inputFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={onSelecionarFotos}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputFileRef.current?.click()}
          disabled={loading || enviandoFoto}
          title="Anexar foto do cupom/nota"
        >
          {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </Button>
        <Button onClick={enviar} disabled={!podeEnviar}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
        </Button>
      </div>

      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {anexos.map((a) => (
            <div key={a.url} className="relative">
              <img
                src={a.url}
                alt={a.name}
                className="w-16 h-16 object-cover rounded-md border border-violet-200"
              />
              <button
                onClick={() => removerAnexo(a.url)}
                className="absolute -top-2 -right-2 bg-white border border-slate-300 rounded-full p-0.5 shadow-sm hover:bg-slate-100"
                title="Remover"
              >
                <X className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {EXEMPLOS.map((ex) => (
          <button
            key={ex}
            onClick={() => setComando(ex)}
            className="text-[11px] px-2 py-1 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-100"
          >
            {ex}
          </button>
        ))}
      </div>
    </Card>
  );
}