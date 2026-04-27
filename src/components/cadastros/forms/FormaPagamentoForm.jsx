import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";
import LojaMultiSelect from "../LojaMultiSelect";

export default function FormaPagamentoForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Tipo">
        <Select value={data.tipo || "outro"} onValueChange={(v) => set("tipo", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="credito">Cartão Crédito</SelectItem>
            <SelectItem value="debito">Cartão Débito</SelectItem>
            <SelectItem value="voucher">Voucher</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Taxa (%)">
        <Input type="number" step="0.01" value={data.taxa_percentual ?? ""} onChange={(e) => set("taxa_percentual", parseFloat(e.target.value) || 0)} disabled={readOnly} />
      </Field>
      <Field label="Prazo recebimento (dias)">
        <Input type="number" value={data.prazo_recebimento_dias ?? ""} onChange={(e) => set("prazo_recebimento_dias", parseInt(e.target.value) || 0)} disabled={readOnly} />
      </Field>
      <Field label="Lojas" className="md:col-span-2" hint="Vazio = aceita em todas">
        <LojaMultiSelect value={data.loja_ids || []} onChange={(v) => set("loja_ids", v)} />
      </Field>
    </div>
  );
}