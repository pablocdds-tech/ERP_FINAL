import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Field from "../Field";

export default function ParametroGeralForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Chave" required>
        <Input value={data.chave || ""} onChange={(e) => set("chave", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Categoria">
        <Select value={data.categoria || "outro"} onValueChange={(v) => set("categoria", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="empresa">Empresa</SelectItem>
            <SelectItem value="fiscal">Fiscal</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
            <SelectItem value="integracao">Integração</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Valor" required className="md:col-span-2">
        <Input value={data.valor || ""} onChange={(e) => set("valor", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Descrição" className="md:col-span-2">
        <Textarea rows={2} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}