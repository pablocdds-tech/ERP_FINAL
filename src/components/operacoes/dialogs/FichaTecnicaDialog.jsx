import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import Field from "@/components/cadastros/Field";

const empty = () => ({
  produto_id: "",
  produto_nome: "",
  rendimento: 1,
  unidade_medida: "",
  ingredientes: [],
  modo_preparo: "",
  observacoes: "",
  ativo: true,
});

export default function FichaTecnicaDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [produtos, setProdutos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      Promise.all([base44.entities.Produto.list(), base44.entities.Insumo.list()])
        .then(([p, i]) => { setProdutos(p); setInsumos(i); });
    }
  }, [open, record]);

  const setProduto = (id) => {
    const p = produtos.find((x) => x.id === id);
    setData({ ...data, produto_id: id, produto_nome: p?.nome || "", unidade_medida: p?.unidade_medida || data.unidade_medida });
  };

  const addIng = () => setData({
    ...data,
    ingredientes: [...(data.ingredientes || []), { insumo_id: "", insumo_nome: "", quantidade: 0, unidade_medida: "" }],
  });
  const updateIng = (idx, patch) => {
    const next = data.ingredientes.map((i, k) => (k === idx ? { ...i, ...patch } : i));
    setData({ ...data, ingredientes: next });
  };
  const removeIng = (idx) =>
    setData({ ...data, ingredientes: data.ingredientes.filter((_, k) => k !== idx) });

  const setInsumo = (idx, id) => {
    const ins = insumos.find((x) => x.id === id);
    updateIng(idx, { insumo_id: id, insumo_nome: ins?.nome || "", unidade_medida: ins?.unidade_medida || "" });
  };

  const salvar = async () => {
    if (!data.produto_id) return;
    setSaving(true);
    if (record?.id) {
      const { id, ...rest } = data;
      await base44.entities.FichaTecnica.update(id, rest);
    } else {
      await base44.entities.FichaTecnica.create(data);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isView ? data.produto_nome : record ? "Editar ficha técnica" : "Nova ficha técnica"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Produto" required className="md:col-span-2">
            <Select value={data.produto_id || ""} onValueChange={setProduto} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rendimento">
            <div className="flex gap-2">
              <Input type="number" step="0.001" value={data.rendimento ?? ""} onChange={(e) => setData({ ...data, rendimento: parseFloat(e.target.value) || 0 })} disabled={isView} />
              <Input className="w-20" placeholder="UM" value={data.unidade_medida || ""} onChange={(e) => setData({ ...data, unidade_medida: e.target.value })} disabled={isView} />
            </div>
          </Field>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Ingredientes</div>
            {!isView && <Button type="button" size="sm" variant="outline" onClick={addIng}><Plus className="w-4 h-4 mr-1.5" />Adicionar</Button>}
          </div>

          <div className="space-y-2">
            {(data.ingredientes || []).length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum ingrediente</Card>
            )}
            {(data.ingredientes || []).map((ing, idx) => (
              <Card key={idx} className="p-3">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-7">
                    <div className="text-[11px] text-muted-foreground mb-1">Insumo</div>
                    <Select value={ing.insumo_id || ""} onValueChange={(v) => setInsumo(idx, v)} disabled={isView}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {insumos.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-7 md:col-span-3">
                    <div className="text-[11px] text-muted-foreground mb-1">Quantidade</div>
                    <Input type="number" step="0.001" value={ing.quantidade ?? ""} onChange={(e) => updateIng(idx, { quantidade: parseFloat(e.target.value) || 0 })} disabled={isView} />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <div className="text-[11px] text-muted-foreground mb-1">UM</div>
                    <Input value={ing.unidade_medida || ""} onChange={(e) => updateIng(idx, { unidade_medida: e.target.value })} disabled={isView} />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    {!isView && (
                      <Button variant="ghost" size="icon" onClick={() => removeIng(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Field label="Modo de preparo">
          <Textarea rows={3} value={data.modo_preparo || ""} onChange={(e) => setData({ ...data, modo_preparo: e.target.value })} disabled={isView} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && <Button onClick={salvar} disabled={saving || !data.produto_id}>{saving ? "Salvando..." : "Salvar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}