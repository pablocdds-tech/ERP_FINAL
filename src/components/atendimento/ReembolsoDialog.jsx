import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

const STATUS = ["pendente", "aprovado", "executado", "negado", "cancelado"];

export default function ReembolsoDialog({ open, onOpenChange, item, onSaved, formasPagamento = [] }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { data: new Date().toISOString().slice(0, 10), status: "pendente", alerta_financeiro: true });
  }, [item, open]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.valor) return;
    if (item?.id) await base44.entities.Reembolso.update(item.id, data);
    else await base44.entities.Reembolso.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar reembolso" : "Novo reembolso"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><Input type="date" value={data.data || ""} onChange={(e) => set("data", e.target.value)} /></Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} /></Field>
          <Field label="Cliente" className="col-span-2"><Input value={data.cliente_nome || ""} onChange={(e) => set("cliente_nome", e.target.value)} /></Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor || ""} onChange={(e) => set("valor", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Forma de devolução">
            <Select value={data.forma_pagamento_id || "_none"} onValueChange={(v) => set("forma_pagamento_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(não definida)</SelectItem>
                {formasPagamento.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pedido (referência)">
            <Input value={data.pedido_referencia || ""} onChange={(e) => set("pedido_referencia", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={data.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Autorizado por" className="col-span-2">
            <Input value={data.autorizado_por || ""} onChange={(e) => set("autorizado_por", e.target.value)} />
          </Field>
          <Field label="Motivo" className="col-span-2">
            <Textarea rows={2} value={data.motivo || ""} onChange={(e) => set("motivo", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}