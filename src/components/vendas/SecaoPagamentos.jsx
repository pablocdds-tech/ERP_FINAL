import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SecaoPagamentos({ formas, pagamentos, onChange, disabled, mostrarConferido = false }) {
  const linhaDe = (formaId) => pagamentos.find((p) => p.forma_id === formaId);

  const set = (forma, campo, val) => {
    const v = parseFloat(val) || 0;
    const existing = linhaDe(forma.id);
    let next;
    if (existing) {
      next = pagamentos.map((p) => p.forma_id === forma.id ? { ...p, [campo]: v } : p);
    } else {
      next = [...pagamentos, {
        forma_id: forma.id,
        forma_nome: forma.nome,
        forma_tipo: forma.tipo,
        valor_declarado: campo === "valor_declarado" ? v : 0,
        valor_conferido: campo === "valor_conferido" ? v : 0,
      }];
    }
    onChange(next);
  };

  if (formas.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">Cadastre formas de pagamento primeiro.</Card>;
  }

  return (
    <div className="space-y-2">
      <div className={`grid ${mostrarConferido ? "grid-cols-12" : "grid-cols-9"} gap-2 text-[11px] text-muted-foreground px-1`}>
        <div className="col-span-5">Forma</div>
        <div className="col-span-4 text-right">Declarado</div>
        {mostrarConferido && <div className="col-span-3 text-right">Conferido</div>}
      </div>
      {formas.map((f) => {
        const linha = linhaDe(f.id) || {};
        const dif = (Number(linha.valor_conferido) || 0) - (Number(linha.valor_declarado) || 0);
        return (
          <div key={f.id} className={`grid ${mostrarConferido ? "grid-cols-12" : "grid-cols-9"} gap-2 items-center`}>
            <div className="col-span-5 text-sm">
              {f.nome}
              <span className="text-[10px] uppercase text-muted-foreground ml-1.5">{f.tipo}</span>
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              className="col-span-4 text-right"
              value={linha.valor_declarado ?? ""}
              onChange={(e) => set(f, "valor_declarado", e.target.value)}
              disabled={disabled}
            />
            {mostrarConferido && (
              <div className="col-span-3 flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="text-right"
                  value={linha.valor_conferido ?? ""}
                  onChange={(e) => set(f, "valor_conferido", e.target.value)}
                  disabled={disabled}
                />
                {Math.abs(dif) > 0.001 && (
                  <span className={`text-[10px] font-mono ${dif > 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {dif > 0 ? "+" : ""}{dif.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}