import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

const empty = () => ({
  nome: "", banco: "", agencia: "", numero: "",
  tipo: "corrente", natureza: "pj", socio_nome: "",
  limite: 0, taxa_juros_mensal: 0,
  loja_id: "", saldo_inicial: 0, ativo: true,
});

export default function ContaBancariaDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => { if (open) setData(record ? { ...record } : empty()); }, [open, record]);

  const salvar = async () => {
    if (!data.nome) return;
    setSaving(true);
    if (record?.id) {
      const { id, ...rest } = data;
      await base44.entities.ContaBancaria.update(id, rest);
    } else {
      const created = await base44.entities.ContaBancaria.create(data);
      // Se tem saldo inicial, gera movimentação inicial
      if (Number(data.saldo_inicial) !== 0) {
        await base44.entities.MovimentacaoBancaria.create({
          conta_bancaria_id: created.id,
          tipo: "saldo_inicial",
          data: new Date().toISOString().slice(0, 10),
          valor: Math.abs(Number(data.saldo_inicial)),
          descricao: "Saldo inicial",
          loja_id: data.loja_id,
          origem_tipo: "saldo_inicial",
        });
      }
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{isView ? "Conta bancária" : record ? "Editar conta" : "Nova conta bancária"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome / Apelido" required className="col-span-2">
            <Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Banco">
            <Input value={data.banco || ""} onChange={(e) => setData({ ...data, banco: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="caixa">Caixa físico</SelectItem>
                <SelectItem value="cartao_pf">Cartão PF</SelectItem>
                <SelectItem value="cheque_especial_pf">Cheque especial PF</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Natureza">
            <Select value={data.natureza || "pj"} onValueChange={(v) => setData({ ...data, natureza: v })} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pj">PJ — empresa</SelectItem>
                <SelectItem value="pf">PF — sócio</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {data.natureza === "pf" && (
            <Field label="Sócio titular">
              <Input value={data.socio_nome || ""} onChange={(e) => setData({ ...data, socio_nome: e.target.value })} disabled={isView} placeholder="Nome do sócio" />
            </Field>
          )}
          {(data.tipo === "cheque_especial_pf" || data.tipo === "cartao_pf") && (
            <>
              <Field label="Limite (R$)">
                <Input type="number" step="0.01" value={data.limite ?? 0} onChange={(e) => setData({ ...data, limite: parseFloat(e.target.value) || 0 })} disabled={isView} />
              </Field>
              <Field label="Juros mensal (%)">
                <Input type="number" step="0.01" value={data.taxa_juros_mensal ?? 0} onChange={(e) => setData({ ...data, taxa_juros_mensal: parseFloat(e.target.value) || 0 })} disabled={isView} />
              </Field>
            </>
          )}
          <Field label="Agência">
            <Input value={data.agencia || ""} onChange={(e) => setData({ ...data, agencia: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Loja titular">
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
          </Field>
          <Field label="Saldo inicial (R$)">
            <Input type="number" step="0.01" value={data.saldo_inicial ?? ""} onChange={(e) => setData({ ...data, saldo_inicial: parseFloat(e.target.value) || 0 })} disabled={isView || record} />
          </Field>
          {!isView && (
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="cb-ativo" />
              <Label htmlFor="cb-ativo" className="text-sm cursor-pointer">{data.ativo !== false ? "Ativa" : "Inativa"}</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && <Button onClick={salvar} disabled={saving || !data.nome}>{saving ? "..." : "Salvar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}