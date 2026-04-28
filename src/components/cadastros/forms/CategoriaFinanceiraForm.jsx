import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";

export default function CategoriaFinanceiraForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required className="md:col-span-2">
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Tipo" required>
        <Select value={data.tipo || "despesa"} onValueChange={(v) => set("tipo", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Grupo">
        <Input value={data.grupo || ""} onChange={(e) => set("grupo", e.target.value)} disabled={readOnly} />
      </Field>
      {data.tipo !== "receita" && (
        <Field label="Grupo no DRE" hint="Como esta categoria aparece no DRE Gerencial">
          <Select value={data.grupo_dre || "__none__"} onValueChange={(v) => set("grupo_dre", v === "__none__" ? "" : v)} disabled={readOnly}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Não classificada (Outras) —</SelectItem>
              <SelectItem value="pessoal">Pessoal e Folha</SelectItem>
              <SelectItem value="ocupacao">Ocupação (aluguel, condomínio, IPTU)</SelectItem>
              <SelectItem value="utilidades">Utilidades (energia, água, gás, internet)</SelectItem>
              <SelectItem value="marketing">Marketing e Comissões</SelectItem>
              <SelectItem value="administrativas">Administrativas</SelectItem>
              <SelectItem value="manutencao">Manutenção e Limpeza</SelectItem>
              <SelectItem value="impostos">Impostos sobre Venda</SelectItem>
              <SelectItem value="financeiras">Financeiras (juros, taxas bancárias)</SelectItem>
              <SelectItem value="outras">Outras</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}