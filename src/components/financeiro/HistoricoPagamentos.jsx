import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { estornarBaixa } from "@/lib/financeiro-service";

export default function HistoricoPagamentos({ baixas, contas, formas, documento, documento_tipo, onChanged }) {
  const [estornando, setEstornando] = useState(null);
  const ativos = baixas.filter((b) => !b.estornada);

  const nomeConta = (id) => contas.find((c) => c.id === id)?.nome || "—";
  const nomeForma = (id) => formas.find((f) => f.id === id)?.nome || "—";

  const handleEstornar = async (b) => {
    if (!window.confirm(`Estornar pagamento de R$ ${Number(b.valor).toFixed(2)}? A movimentação bancária será removida.`)) return;
    setEstornando(b.id);
    try {
      await estornarBaixa({ baixa: b, documento, documento_tipo });
      await onChanged?.();
    } catch (e) {
      alert(e.message || "Erro ao estornar");
    }
    setEstornando(null);
  };

  if (ativos.length === 0) {
    return <div className="text-xs text-muted-foreground py-3 text-center">Nenhum pagamento registrado.</div>;
  }

  return (
    <div className="space-y-1.5">
      {ativos.map((b) => (
        <div key={b.id} className="flex items-center gap-3 text-xs bg-muted/30 rounded px-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="font-mono font-semibold">R$ {Number(b.valor).toFixed(2)}</div>
            <div className="text-muted-foreground truncate">
              {b.data ? format(new Date(b.data), "dd/MM/yyyy") : "—"} · {nomeConta(b.conta_bancaria_id)}
              {b.forma_pagamento_id && ` · ${nomeForma(b.forma_pagamento_id)}`}
            </div>
            {b.usuario_email && <div className="text-[10px] text-muted-foreground/70">por {b.usuario_email}</div>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleEstornar(b)}
            disabled={estornando === b.id}
            title="Estornar pagamento"
          >
            {estornando === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ))}
    </div>
  );
}