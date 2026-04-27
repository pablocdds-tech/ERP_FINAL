import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Field from "../Field";
import LojaMultiSelect from "../LojaMultiSelect";

export default function ProdutoForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome" required className="md:col-span-2">
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Código (SKU)">
        <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Categoria">
        <Input value={data.categoria || ""} onChange={(e) => set("categoria", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Unidade de Medida" hint="Sigla (UN, KG, L)">
        <Input value={data.unidade_medida || ""} onChange={(e) => set("unidade_medida", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Preço de Venda (R$)">
        <Input type="number" step="0.01" value={data.preco_venda ?? ""} onChange={(e) => set("preco_venda", parseFloat(e.target.value) || 0)} disabled={readOnly} />
      </Field>
      <Field label="Lojas" className="md:col-span-2" hint="Vazio = vendido em todas">
        <LojaMultiSelect value={data.loja_ids || []} onChange={(v) => set("loja_ids", v)} />
      </Field>
      <Field label="Observações" className="md:col-span-2">
        <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}