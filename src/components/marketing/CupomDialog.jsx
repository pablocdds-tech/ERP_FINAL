import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import Field from "@/components/cadastros/Field";

const TIPOS = [
  { value: "percentual", label: "Percentual (%)" },
  { value: "valor_fixo", label: "Valor fixo (R$)" },
  { value: "frete_gratis", label: "Frete grátis" },
];

export default function CupomDialog({ open, onOpenChange, item, onSaved, campanhas = [] }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { tipo_desconto: "percentual", limite_por_cliente: 1, ativo: true });
  }, [item, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.codigo) return;
    const payload = { ...data, codigo: data.codigo.toUpperCase().trim() };
    if (item?.id) await base44.entities.Cupom.update(item.id, payload);
    else await base44.entities.Cupom.create(payload);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código" required>
            <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value)} placeholder="EX: PIZZA20" />
          </Field>
          <Field label="Campanha vinculada">
            <Select value={data.campanha_id || "_none"} onValueChange={(v) => set("campanha_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="(nenhuma)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(nenhuma)</SelectItem>
                {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Input value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} />
          </Field>
          <Field label="Tipo de desconto">
            <Select value={data.tipo_desconto} onValueChange={(v) => set("tipo_desconto", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={data.tipo_desconto === "percentual" ? "Desconto (%)" : "Desconto (R$)"}>
            <Input type="number" step="0.01" disabled={data.tipo_desconto === "frete_gratis"}
              value={data.valor_desconto || ""} onChange={(e) => set("valor_desconto", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Valor mínimo do pedido (R$)">
            <Input type="number" step="0.01" value={data.valor_minimo_pedido || ""}
              onChange={(e) => set("valor_minimo_pedido", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Teto de desconto (R$)" hint="Apenas para %">
            <Input type="number" step="0.01" disabled={data.tipo_desconto !== "percentual"}
              value={data.valor_maximo_desconto || ""} onChange={(e) => set("valor_maximo_desconto", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Início">
            <Input type="date" value={data.data_inicio || ""} onChange={(e) => set("data_inicio", e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="date" value={data.data_fim || ""} onChange={(e) => set("data_fim", e.target.value)} />
          </Field>
          <Field label="Limite total de usos">
            <Input type="number" value={data.limite_total_usos || ""} onChange={(e) => set("limite_total_usos", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Limite por cliente">
            <Input type="number" value={data.limite_por_cliente || 1} onChange={(e) => set("limite_por_cliente", parseInt(e.target.value) || 1)} />
          </Field>
          <Field label="Apenas primeira compra" className="col-span-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!data.primeira_compra_apenas} onCheckedChange={(v) => set("primeira_compra_apenas", v)} />
              <span className="text-xs text-muted-foreground">Cupom só vale para clientes sem compras anteriores</span>
            </div>
          </Field>
          <Field label="Ativo" className="col-span-2">
            <Switch checked={data.ativo !== false} onCheckedChange={(v) => set("ativo", v)} />
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