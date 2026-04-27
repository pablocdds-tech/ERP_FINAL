import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";
import LojaMultiSelect from "../LojaMultiSelect";

export default function CanalVendaForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Tipo">
        <Select value={data.tipo || "presencial"} onValueChange={(v) => set("tipo", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="presencial">Presencial</SelectItem>
            <SelectItem value="delivery_proprio">Delivery próprio</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
            <SelectItem value="telefone">Telefone</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Taxa / Comissão (%)" className="md:col-span-2">
        <Input type="number" step="0.01" value={data.taxa_percentual ?? ""} onChange={(e) => set("taxa_percentual", parseFloat(e.target.value) || 0)} disabled={readOnly} />
      </Field>
      <Field label="Lojas" className="md:col-span-2" hint="Vazio = disponível em todas">
        <LojaMultiSelect value={data.loja_ids || []} onChange={(v) => set("loja_ids", v)} />
      </Field>
    </div>
  );
}