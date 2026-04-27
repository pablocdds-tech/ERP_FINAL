import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

export default function CortesiaDialog({ open, onOpenChange, item, onSaved }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { data: new Date().toISOString().slice(0, 10), tipo: "produto", alerta_financeiro: true });
  }, [item, open]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (item?.id) await base44.entities.Cortesia.update(item.id, data);
    else await base44.entities.Cortesia.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar cortesia" : "Nova cortesia"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><Input type="date" value={data.data || ""} onChange={(e) => set("data", e.target.value)} /></Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} /></Field>
          <Field label="Cliente" className="col-span-2"><Input value={data.cliente_nome || ""} onChange={(e) => set("cliente_nome", e.target.value)} /></Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="desconto_proximo">Desconto na próxima</SelectItem>
                <SelectItem value="voucher">Voucher</SelectItem>
                <SelectItem value="brinde">Brinde</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor estimado (R$)">
            <Input type="number" step="0.01" value={data.valor_estimado || ""} onChange={(e) => set("valor_estimado", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Autorizado por" className="col-span-2">
            <Input value={data.autorizado_por || ""} onChange={(e) => set("autorizado_por", e.target.value)} />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={2} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} />
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