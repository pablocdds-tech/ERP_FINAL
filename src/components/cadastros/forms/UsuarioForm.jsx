import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";
import LojaSingleSelect from "../LojaSingleSelect";

export default function UsuarioForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome">
        <Input value={data.full_name || ""} disabled />
      </Field>
      <Field label="Email">
        <Input value={data.email || ""} disabled />
      </Field>
      <Field label="Perfil" required>
        <Select value={data.role || "funcionario"} onValueChange={(v) => set("role", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin Geral</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
            <SelectItem value="funcionario">Funcionário</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Loja vinculada">
        <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} />
      </Field>
      <Field label="Cargo">
        <Input value={data.cargo || ""} onChange={(e) => set("cargo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Telefone">
        <Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} />
      </Field>
      <p className="md:col-span-2 text-xs text-muted-foreground -mt-1">
        Usuários novos devem ser convidados via convite. Aqui é possível ajustar perfil e loja.
      </p>
    </div>
  );
}