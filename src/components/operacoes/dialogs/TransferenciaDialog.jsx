import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import ItemLineEditor from "@/components/operacoes/ItemLineEditor";
import { registrarMovimentacoes } from "@/lib/operacoes-service";

const empty = () => ({
  numero: "",
  loja_origem_id: "",
  loja_destino_id: "",
  data: new Date().toISOString().slice(0, 10),
  motivo: "",
  itens: [],
  observacoes: "",
});

export default function TransferenciaDialog({ open, mode, record, lojas = [], onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => { if (open) setData(record ? { ...record } : empty()); }, [open, record]);

  const lojaSelect = (value, onChange) => (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)} disabled={isView}>
      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
      <SelectContent>
        {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const salvar = async () => {
    if (!data.loja_origem_id || !data.loja_destino_id || data.loja_origem_id === data.loja_destino_id) return;
    if (data.itens.length === 0) return;
    setSaving(true);

    const created = await base44.entities.Transferencia.create({ ...data, status: "lancada" });

    const movs = [];
    for (const it of data.itens) {
      if (!it.item_id || !it.quantidade) continue;
      movs.push({
        tipo: "transferencia_saida",
        item_tipo: it.item_tipo,
        item_id: it.item_id,
        item_nome: it.item_nome,
        quantidade: Number(it.quantidade),
        loja_id: data.loja_origem_id,
        loja_origem_id: data.loja_origem_id,
        loja_destino_id: data.loja_destino_id,
        data: data.data,
        motivo: data.motivo || "Transferência",
        origem_tipo: "transferencia",
        origem_id: created.id,
      });
      movs.push({
        tipo: "transferencia_entrada",
        item_tipo: it.item_tipo,
        item_id: it.item_id,
        item_nome: it.item_nome,
        quantidade: Number(it.quantidade),
        loja_id: data.loja_destino_id,
        loja_origem_id: data.loja_origem_id,
        loja_destino_id: data.loja_destino_id,
        data: data.data,
        motivo: data.motivo || "Transferência",
        origem_tipo: "transferencia",
        origem_id: created.id,
      });
    }
    await registrarMovimentacoes(movs);

    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isView ? "Transferência" : "Nova transferência"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Loja origem" required>
            {lojaSelect(data.loja_origem_id, (v) => setData({ ...data, loja_origem_id: v }))}
          </Field>
          <Field label="Loja destino" required>
            {lojaSelect(data.loja_destino_id, (v) => setData({ ...data, loja_destino_id: v }))}
          </Field>
          <Field label="Motivo" className="md:col-span-2">
            <Input value={data.motivo || ""} onChange={(e) => setData({ ...data, motivo: e.target.value })} disabled={isView} />
          </Field>
        </div>

        <div className="pt-2">
          <div className="text-sm font-medium mb-2">Itens</div>
          {isView ? (
            <div className="space-y-1 text-sm">
              {data.itens?.map((it, i) => (
                <div key={i} className="flex justify-between border-b border-border py-1.5">
                  <span>{it.item_nome}</span>
                  <span className="text-muted-foreground">{it.quantidade}</span>
                </div>
              ))}
            </div>
          ) : (
            <ItemLineEditor
              itens={data.itens}
              onChange={(itens) => setData({ ...data, itens })}
              tipoItens="ambos"
            />
          )}
        </div>

        <Field label="Observações">
          <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} disabled={isView} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && (
            <Button
              onClick={salvar}
              disabled={
                saving ||
                !data.loja_origem_id ||
                !data.loja_destino_id ||
                data.loja_origem_id === data.loja_destino_id ||
                data.itens.length === 0
              }
            >
              {saving ? "Salvando..." : "Lançar transferência"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}