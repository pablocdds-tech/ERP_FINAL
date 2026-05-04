import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import ItemPicker from "./ItemPicker";
import ItemQuickDialog from "./dialogs/ItemQuickDialog";

// Editor genérico de itens em documentos (compras, transferências).
// Props:
// - itens: array
// - onChange(itens)
// - showCusto: boolean (Compra exibe custo, Transferência não)
// - tipoItens: "ambos" | "insumo" | "produto"
export default function ItemLineEditor({ itens = [], onChange, showCusto = false, tipoItens = "ambos" }) {
  const [quickIdx, setQuickIdx] = useState(null);

  const update = (idx, patch) => {
    const next = itens.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    if (showCusto && (patch.quantidade !== undefined || patch.custo_unitario !== undefined)) {
      const it = next[idx];
      it.total = (Number(it.quantidade) || 0) * (Number(it.custo_unitario) || 0);
    }
    onChange(next);
  };

  const remove = (idx) => onChange(itens.filter((_, i) => i !== idx));

  const add = () =>
    onChange([
      ...itens,
      {
        item_tipo: tipoItens === "ambos" ? "insumo" : tipoItens,
        item_id: "",
        item_nome: "",
        quantidade: 1,
        ...(showCusto ? { custo_unitario: 0, total: 0 } : {}),
      },
    ]);

  const total = showCusto
    ? itens.reduce((sum, it) => sum + (Number(it.total) || 0), 0)
    : null;

  return (
    <div className="space-y-2">
      {itens.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum item adicionado
        </Card>
      )}
      {itens.map((it, idx) => (
        <Card key={idx} className="p-3">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 md:col-span-6">
              <div className="text-[11px] text-muted-foreground mb-1">Item</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ItemPicker
                    tipo={tipoItens}
                    value={{ item_tipo: it.item_tipo, item_id: it.item_id, item_nome: it.item_nome }}
                    onChange={(v) => update(idx, v)}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setQuickIdx(idx)} title="Cadastro rápido">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Qtd</div>
              <Input
                type="number"
                step="0.001"
                value={it.quantidade ?? ""}
                onChange={(e) => update(idx, { quantidade: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {showCusto && (
              <>
                <div className="col-span-6 md:col-span-2">
                  <div className="text-[11px] text-muted-foreground mb-1">Custo unit.</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={it.custo_unitario ?? ""}
                    onChange={(e) => update(idx, { custo_unitario: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-10 md:col-span-1">
                  <div className="text-[11px] text-muted-foreground mb-1">Total</div>
                  <div className="h-9 flex items-center text-sm font-medium">
                    R$ {Number(it.total || 0).toFixed(2)}
                  </div>
                </div>
              </>
            )}
            <div className="col-span-2 md:col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1.5" /> Adicionar item
        </Button>
        {showCusto && (
          <div className="text-sm">
            Total: <span className="font-semibold">R$ {total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <ItemQuickDialog
        open={quickIdx !== null}
        tipo={tipoItens}
        onClose={() => setQuickIdx(null)}
        onCreated={(v) => {
          if (quickIdx !== null) update(quickIdx, v);
          setQuickIdx(null);
        }}
      />
    </div>
  );
}