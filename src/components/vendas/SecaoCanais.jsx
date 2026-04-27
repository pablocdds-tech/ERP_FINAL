import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SecaoCanais({ canais, vendas, onChange, disabled }) {
  const valorDe = (canalId) => vendas.find((v) => v.canal_id === canalId)?.valor || "";

  const setValor = (canal, val) => {
    const v = parseFloat(val) || 0;
    const exists = vendas.find((x) => x.canal_id === canal.id);
    let next;
    if (exists) {
      next = vendas.map((x) => x.canal_id === canal.id ? { ...x, valor: v } : x);
    } else {
      next = [...vendas, { canal_id: canal.id, canal_nome: canal.nome, valor: v }];
    }
    onChange(next);
  };

  if (canais.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">Cadastre canais de venda primeiro.</Card>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {canais.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <div className="flex-1 text-sm">{c.nome}</div>
          <Input
            type="number"
            step="0.01"
            placeholder="0,00"
            className="w-32 text-right"
            value={valorDe(c.id)}
            onChange={(e) => setValor(c, e.target.value)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}