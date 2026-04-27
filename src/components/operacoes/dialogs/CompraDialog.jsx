import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import ItemLineEditor from "@/components/operacoes/ItemLineEditor";
import { registrarMovimentacoes } from "@/lib/operacoes-service";

const empty = () => ({
  numero: "",
  fornecedor_id: "",
  loja_id: "",
  data: new Date().toISOString().slice(0, 10),
  itens: [],
  valor_total: 0,
  conta_pagar_prevista: false,
  observacoes: "",
});

export default function CompraDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [fornecedores, setFornecedores] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      base44.entities.Fornecedor.list().then(setFornecedores);
    }
  }, [open, record]);

  const setItens = (itens) => {
    const total = itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
    setData({ ...data, itens, valor_total: total });
  };

  const salvar = async () => {
    if (!data.loja_id || !data.data || data.itens.length === 0) return;
    setSaving(true);

    const created = await base44.entities.Compra.create({
      ...data,
      status: "lancada",
    });

    // Gera entradas de estoque
    const movs = data.itens
      .filter((it) => it.item_id && it.quantidade > 0)
      .map((it) => ({
        tipo: "entrada",
        item_tipo: it.item_tipo,
        item_id: it.item_id,
        item_nome: it.item_nome,
        quantidade: Number(it.quantidade),
        loja_id: data.loja_id,
        data: data.data,
        motivo: "Entrada por compra",
        origem_tipo: "compra",
        origem_id: created.id,
      }));
    await registrarMovimentacoes(movs);

    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isView ? `Compra ${data.numero || ""}` : "Nova compra"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Fornecedor">
            <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => setData({ ...data, fornecedor_id: v === "__none__" ? "" : v })} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loja / CD que recebeu" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} allowEmpty={false} />
          </Field>
        </div>

        <div className="pt-2">
          <div className="text-sm font-medium mb-2">Itens</div>
          {isView ? (
            <div className="space-y-1 text-sm">
              {data.itens?.map((it, i) => (
                <div key={i} className="flex justify-between border-b border-border py-1.5">
                  <span>{it.item_nome}</span>
                  <span className="text-muted-foreground">{it.quantidade} × R$ {Number(it.custo_unitario || 0).toFixed(2)} = R$ {Number(it.total || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-end pt-2 font-semibold">Total: R$ {Number(data.valor_total || 0).toFixed(2)}</div>
            </div>
          ) : (
            <ItemLineEditor itens={data.itens} onChange={setItens} showCusto tipoItens="ambos" />
          )}
        </div>

        {!isView && (
          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="cp-prevista"
              checked={data.conta_pagar_prevista || false}
              onCheckedChange={(v) => setData({ ...data, conta_pagar_prevista: v })}
            />
            <Label htmlFor="cp-prevista" className="text-sm">
              Prever conta a pagar <span className="text-muted-foreground">(integração Financeiro futura)</span>
            </Label>
          </div>
        )}

        <Field label="Observações">
          <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} disabled={isView} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && (
            <Button onClick={salvar} disabled={saving || !data.loja_id || data.itens.length === 0}>
              {saving ? "Salvando..." : "Lançar compra"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}