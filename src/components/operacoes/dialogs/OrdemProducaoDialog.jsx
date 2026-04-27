import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

const empty = () => ({
  numero: "",
  ficha_id: "",
  produto_id: "",
  produto_nome: "",
  loja_id: "",
  data: new Date().toISOString().slice(0, 10),
  quantidade_planejada: 1,
  quantidade_produzida: null,
  observacoes: "",
});

export default function OrdemProducaoDialog({ open, mode, record, fichas = [], onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => { if (open) setData(record ? { ...record } : empty()); }, [open, record]);

  const setFicha = (id) => {
    const f = fichas.find((x) => x.id === id);
    setData({
      ...data,
      ficha_id: id,
      produto_id: f?.produto_id || "",
      produto_nome: f?.produto_nome || "",
    });
  };

  const fichaSelecionada = fichas.find((f) => f.id === data.ficha_id);

  const salvar = async () => {
    if (!data.ficha_id || !data.loja_id) return;
    setSaving(true);
    await base44.entities.OrdemProducao.create({ ...data, status: "aberta" });
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isView ? "Ordem de produção" : "Nova ordem de produção"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Ficha técnica" required className="md:col-span-2">
            <Select value={data.ficha_id || ""} onValueChange={setFicha} disabled={isView || !!record}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {fichas.filter((f) => f.ativo !== false).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.produto_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loja / CD" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} allowEmpty={false} />
          </Field>
          <Field label="Quantidade planejada" required>
            <Input type="number" step="0.001" value={data.quantidade_planejada ?? ""} onChange={(e) => setData({ ...data, quantidade_planejada: parseFloat(e.target.value) || 0 })} disabled={isView} />
          </Field>
          {(isView || record) && (
            <Field label="Quantidade produzida" className="md:col-span-2">
              <Input type="number" step="0.001" value={data.quantidade_produzida ?? ""} onChange={(e) => setData({ ...data, quantidade_produzida: parseFloat(e.target.value) || 0 })} disabled={isView} />
            </Field>
          )}
        </div>

        {fichaSelecionada && (
          <div className="bg-muted/40 rounded-lg p-3 text-xs">
            <div className="font-medium mb-1">Insumos previstos (por unidade da ficha):</div>
            <div className="space-y-0.5">
              {(fichaSelecionada.ingredientes || []).map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.insumo_nome}</span>
                  <span className="text-muted-foreground">{i.quantidade} {i.unidade_medida}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field label="Observações">
          <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} disabled={isView} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && !record && (
            <Button onClick={salvar} disabled={saving || !data.ficha_id || !data.loja_id}>
              {saving ? "Salvando..." : "Abrir ordem"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}