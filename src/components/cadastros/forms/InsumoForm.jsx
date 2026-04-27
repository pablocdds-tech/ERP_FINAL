import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";
import LojaMultiSelect from "../LojaMultiSelect";

export default function InsumoForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const [fornecedores, setFornecedores] = useState([]);
  useEffect(() => {
    base44.entities.Fornecedor.list().then((d) => setFornecedores(d || []));
  }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required className="md:col-span-2">
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Código">
        <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Categoria">
        <Input value={data.categoria || ""} onChange={(e) => set("categoria", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Unidade de Medida">
        <Input value={data.unidade_medida || ""} onChange={(e) => set("unidade_medida", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Custo Referência (R$)">
        <Input type="number" step="0.01" value={data.custo_referencia ?? ""} onChange={(e) => set("custo_referencia", parseFloat(e.target.value) || 0)} disabled={readOnly} />
      </Field>
      <Field label="Fornecedor" className="md:col-span-2">
        <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => set("fornecedor_id", v === "__none__" ? "" : v)} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Nenhum —</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Lojas" className="md:col-span-2" hint="Vazio = utilizado em todas">
        <LojaMultiSelect value={data.loja_ids || []} onChange={(v) => set("loja_ids", v)} />
      </Field>
      <Field label="Observações" className="md:col-span-2">
        <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}