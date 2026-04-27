import { Input } from "@/components/ui/input";
import Field from "../Field";
import LojaSingleSelect from "../LojaSingleSelect";

export default function CentroCustoForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Código">
        <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Loja vinculada" className="md:col-span-2" hint="Vazio = corporativo">
        <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} emptyLabel="— Corporativo —" />
      </Field>
    </div>
  );
}