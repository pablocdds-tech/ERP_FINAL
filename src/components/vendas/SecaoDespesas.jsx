import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function SecaoDespesas({ despesas, categorias, onChange, disabled }) {
  const add = () => onChange([...despesas, { categoria_id: "", categoria_nome: "", valor: 0, descricao: "", fornecedor: "" }]);
  const update = (idx, patch) => onChange(despesas.map((d, i) => i === idx ? { ...d, ...patch } : d));
  const remove = (idx) => onChange(despesas.filter((_, i) => i !== idx));

  const setCategoria = (idx, id) => {
    const c = categorias.find((x) => x.id === id);
    update(idx, { categoria_id: id, categoria_nome: c?.nome || "" });
  };

  const cats = categorias.filter((c) => c.tipo === "despesa" && c.ativo !== false);

  return (
    <div className="space-y-2">
      {despesas.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">Sem despesas registradas</Card>
      )}
      {despesas.map((d, idx) => (
        <Card key={idx} className="p-3">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 md:col-span-4">
              <div className="text-[11px] text-muted-foreground mb-1">Categoria</div>
              <Select value={d.categoria_id || ""} onValueChange={(v) => setCategoria(idx, v)} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-7 md:col-span-3">
              <div className="text-[11px] text-muted-foreground mb-1">Descrição</div>
              <Input value={d.descricao || ""} onChange={(e) => update(idx, { descricao: e.target.value })} disabled={disabled} />
            </div>
            <div className="col-span-12 md:col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Fornecedor</div>
              <Input value={d.fornecedor || ""} onChange={(e) => update(idx, { fornecedor: e.target.value })} disabled={disabled} />
            </div>
            <div className="col-span-10 md:col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Valor (R$)</div>
              <Input type="number" step="0.01" className="text-right" value={d.valor ?? ""} onChange={(e) => update(idx, { valor: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="col-span-2 md:col-span-1 flex justify-end">
              {!disabled && (
                <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1.5" /> Adicionar despesa
        </Button>
      )}
    </div>
  );
}