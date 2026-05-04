import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Loader2 } from "lucide-react";
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
  const navigate = useNavigate();

  const enviar = async () => {
    if (!comando.trim() || loading) return;
    setLoading(true);
    try {
      const usuario = await base44.auth.me().catch(() => null);
      const { comando: registro } = await criarComando({
        comando: comando.trim(),
        modelo: "automatic",
        usuario,
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
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-4 h-4 text-violet-600" />
        <h2 className="text-sm font-semibold">Executor ERP — comando rápido</h2>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Digite o que deseja que o agente faça..."
          value={comando}
          onChange={(e) => setComando(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          disabled={loading}
        />
        <Button onClick={enviar} disabled={loading || !comando.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar"}
        </Button>
      </div>
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