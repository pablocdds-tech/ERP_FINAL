import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Field from "../Field";

export default function FornecedorForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Razão Social">
        <Input value={data.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="CNPJ / CPF">
        <Input value={data.cnpj_cpf || ""} onChange={(e) => set("cnpj_cpf", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Telefone">
        <Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Email">
        <Input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Pessoa de Contato">
        <Input value={data.contato || ""} onChange={(e) => set("contato", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Endereço" className="md:col-span-2">
        <Textarea rows={2} value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Observações" className="md:col-span-2">
        <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}