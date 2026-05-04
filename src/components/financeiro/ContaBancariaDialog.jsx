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

const TIPOS_CONTA = [
  { value: "conta_corrente_pj", label: "Conta corrente PJ", natureza: "PJ" },
  { value: "conta_corrente_pf", label: "Conta corrente PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "conta_pagamento_pf", label: "Conta pagamento PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "cartao_credito_pf", label: "Cartão de crédito PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "cartao_debito_pf", label: "Cartão de débito PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "cheque_especial_pf", label: "Cheque especial PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "maquininha_pf", label: "Maquininha PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "pix_pf", label: "Pix PF", natureza: "PF_USO_OPERACIONAL" },
  { value: "caixa_fisico", label: "Caixa físico", natureza: "PJ" },
  { value: "banco_virtual", label: "Banco virtual (CD/Lojas)", natureza: "VIRTUAL_INTERNO" },
  { value: "outro", label: "Outro", natureza: "PJ" },
];

const NATUREZAS = [
  { value: "PJ", label: "PJ — empresa" },
  { value: "PF_USO_OPERACIONAL", label: "PF — uso operacional do sócio" },
  { value: "VIRTUAL_INTERNO", label: "Virtual interno (CD/Lojas)" },
];

const empty = () => ({
  nome: "", instituicao: "", banco: "", agencia: "", numero: "", ultimos_4_digitos: "",
  tipo_conta: "conta_corrente_pj", natureza: "PJ",
  socio_vinculado: "", uso_temporario_operacional: false,
  limite_credito: 0, vencimento_fatura: "", taxa_juros_mensal: 0,
  loja_id: "", saldo_inicial: 0, ativo: true,
});

export default function ContaBancariaDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => {
    if (!open) return;
    if (record) {
      // Compat: deriva tipo_conta/natureza a partir de tipo legado, se necessário
      const r = { ...record };
      if (!r.tipo_conta && r.tipo) {
        const map = {
          corrente: "conta_corrente_pj", poupanca: "conta_corrente_pj", caixa: "caixa_fisico",
          cartao_pf: "cartao_credito_pf", cheque_especial_pf: "cheque_especial_pf", outro: "outro",
        };
        r.tipo_conta = map[r.tipo] || "outro";
      }
      if (!r.natureza || !["PJ", "PF_USO_OPERACIONAL", "VIRTUAL_INTERNO"].includes(r.natureza)) {
        r.natureza = (r.natureza === "pf") ? "PF_USO_OPERACIONAL" : "PJ";
      }
      setData({ ...empty(), ...r });
    } else {
      setData(empty());
    }
  }, [open, record]);

  const onChangeTipo = (v) => {
    const def = TIPOS_CONTA.find((t) => t.value === v);
    setData((d) => ({ ...d, tipo_conta: v, natureza: def?.natureza || d.natureza }));
  };

  const isPF = data.natureza === "PF_USO_OPERACIONAL";
  const isCartao = data.tipo_conta === "cartao_credito_pf";
  const isCheque = data.tipo_conta === "cheque_especial_pf";

  const salvar = async () => {
    if (!data.nome) return;
    setSaving(true);
    // Mantém compat com tipo legado
    const tipoLegado = (() => {
      if (data.tipo_conta === "cartao_credito_pf" || data.tipo_conta === "cartao_debito_pf") return "cartao_pf";
      if (data.tipo_conta === "cheque_especial_pf") return "cheque_especial_pf";
      if (data.tipo_conta === "caixa_fisico") return "caixa";
      if (data.tipo_conta === "conta_corrente_pj" || data.tipo_conta === "conta_corrente_pf") return "corrente";
      return "outro";
    })();
    const numOrUndef = (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const payload = {
      ...data,
      tipo: tipoLegado,
      limite_credito: numOrUndef(data.limite_credito),
      taxa_juros_mensal: numOrUndef(data.taxa_juros_mensal),
      vencimento_fatura: numOrUndef(data.vencimento_fatura),
      saldo_inicial: numOrUndef(data.saldo_inicial) ?? 0,
    };

    if (record?.id) {
      const { id, ...rest } = payload;
      await base44.entities.ContaBancaria.update(id, rest);
    } else {
      const created = await base44.entities.ContaBancaria.create(payload);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isView ? "Conta bancária" : record ? "Editar conta" : "Nova conta bancária"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome / Apelido" required className="col-span-2">
            <Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} disabled={isView} placeholder="Ex: Itaú Matriz, Nubank do Sócio" />
          </Field>

          <Field label="Tipo de conta">
            <Select value={data.tipo_conta} onValueChange={onChangeTipo} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_CONTA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Natureza">
            <Select value={data.natureza} onValueChange={(v) => setData({ ...data, natureza: v })} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NATUREZAS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Instituição">
            <Input value={data.instituicao || ""} onChange={(e) => setData({ ...data, instituicao: e.target.value })} disabled={isView} placeholder="Itaú, Nubank, Visa..." />
          </Field>
          <Field label="Banco (cód./nome)">
            <Input value={data.banco || ""} onChange={(e) => setData({ ...data, banco: e.target.value })} disabled={isView} />
          </Field>

          {isPF && (
            <>
              <Field label="Sócio vinculado" className="col-span-2">
                <Input value={data.socio_vinculado || ""} onChange={(e) => setData({ ...data, socio_vinculado: e.target.value })} disabled={isView} placeholder="Nome do sócio titular" />
              </Field>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={!!data.uso_temporario_operacional}
                  onCheckedChange={(v) => setData({ ...data, uso_temporario_operacional: v })}
                  id="cb-uso-temp"
                  disabled={isView}
                />
                <Label htmlFor="cb-uso-temp" className="text-sm cursor-pointer">
                  Uso temporário operacional (PF servindo a empresa por enquanto)
                </Label>
              </div>
            </>
          )}

          <Field label="Agência">
            <Input value={data.agencia || ""} onChange={(e) => setData({ ...data, agencia: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Últimos 4 dígitos">
            <Input value={data.ultimos_4_digitos || ""} onChange={(e) => setData({ ...data, ultimos_4_digitos: e.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={isView} placeholder="1234" />
          </Field>
          <Field label="Loja titular">
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
          </Field>

          {(isCartao || isCheque) && (
            <>
              <Field label="Limite de crédito (R$)">
                <Input type="number" step="0.01" value={data.limite_credito ?? 0} onChange={(e) => setData({ ...data, limite_credito: parseFloat(e.target.value) || 0 })} disabled={isView} />
              </Field>
              <Field label="Juros mensal (%)">
                <Input type="number" step="0.01" value={data.taxa_juros_mensal ?? 0} onChange={(e) => setData({ ...data, taxa_juros_mensal: parseFloat(e.target.value) || 0 })} disabled={isView} />
              </Field>
            </>
          )}
          {isCartao && (
            <Field label="Vencimento da fatura (dia)">
              <Input type="number" min="1" max="31" value={data.vencimento_fatura ?? ""} onChange={(e) => setData({ ...data, vencimento_fatura: parseInt(e.target.value) || "" })} disabled={isView} />
            </Field>
          )}

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