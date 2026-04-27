import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Field from "../Field";
import { MODULES } from "@/lib/modules";

export default function PerfilForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const togglePerm = (id) => {
    const set_ = new Set(data.permissoes || []);
    set_.has(id) ? set_.delete(id) : set_.add(id);
    set("permissoes", Array.from(set_));
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required>
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Chave" required>
        <Select value={data.chave || ""} onValueChange={(v) => set("chave", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="gestor">gestor</SelectItem>
            <SelectItem value="operador">operador</SelectItem>
            <SelectItem value="funcionario">funcionario</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Descrição" className="md:col-span-2">
        <Textarea rows={2} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Módulos liberados" className="md:col-span-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-border rounded-lg">
          {MODULES.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={(data.permissoes || []).includes(m.id)}
                onCheckedChange={() => togglePerm(m.id)}
                disabled={readOnly}
              />
              <span>{m.nome}</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}