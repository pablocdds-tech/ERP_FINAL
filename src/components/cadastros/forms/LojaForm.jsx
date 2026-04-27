import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Field from "../Field";

export default function LojaForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required className="md:col-span-2">
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Código">
        <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Tipo">
        <Select value={data.tipo || "loja"} onValueChange={(v) => set("tipo", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="loja">Loja</SelectItem>
            <SelectItem value="cd">Centro de Distribuição</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Telefone">
        <Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Endereço" className="md:col-span-2">
        <Textarea rows={2} value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}