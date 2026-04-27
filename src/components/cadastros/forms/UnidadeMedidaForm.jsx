import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";

export default function UnidadeMedidaForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Sigla" required>
        <Input value={data.sigla || ""} onChange={(e) => set("sigla", e.target.value.toUpperCase())} disabled={readOnly} />
      </Field>
      <Field label="Tipo" className="md:col-span-2">
        <Select value={data.tipo || "unidade"} onValueChange={(v) => set("tipo", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="peso">Peso</SelectItem>
            <SelectItem value="volume">Volume</SelectItem>
            <SelectItem value="unidade">Unidade</SelectItem>
            <SelectItem value="comprimento">Comprimento</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}