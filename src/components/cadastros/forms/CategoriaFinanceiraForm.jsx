import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "../Field";
import { GRUPOS, GRUPOS_DRE } from "@/lib/plano-categorias";

const TIPOS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "interno", label: "Interno (transferência/baixa)" },
  { value: "ajuste", label: "Ajuste" },
];

const TIPOS_DRE = [
  { value: "receita", label: "Receita" },
  { value: "deducao", label: "Dedução" },
  { value: "custo", label: "Custo (CMV)" },
  { value: "despesa", label: "Despesa" },
  { value: "investimento", label: "Investimento" },
  { value: "nao_operacional", label: "Não operacional" },
  { value: "nao_aplicavel", label: "Não aplicável" },
];

const NATUREZAS = [
  { value: "operacional", label: "Operacional" },
  { value: "deducao_receita", label: "Dedução de receita" },
  { value: "transferencia_interna", label: "Transferência interna" },
  { value: "baixa_recebivel", label: "Baixa de recebível" },
  { value: "socio_empresa", label: "Sócio x Empresa" },
  { value: "investimento", label: "Investimento" },
  { value: "ajuste", label: "Ajuste" },
];

export default function CategoriaFinanceiraForm({ data, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...data, [k]: v });
  const isSistema = !!data.sistema;
  const lock = readOnly || isSistema;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isSistema && (
        <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[12px] text-amber-800">
          Categoria de sistema. Apenas regra de uso e ativação podem ser alteradas.
        </div>
      )}

      <Field label="Nome" required className="md:col-span-2">
        <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} disabled={lock} />
      </Field>

      <Field label="Código" hint="Identificador único (ex: REC.SALAO)">
        <Input value={data.codigo || ""} onChange={(e) => set("codigo", e.target.value.toUpperCase())} disabled={lock} />
      </Field>

      <Field label="Grupo" required>
        <Select value={data.grupo || ""} onValueChange={(v) => set("grupo", v)} disabled={lock}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Tipo">
        <Select value={data.tipo || "saida"} onValueChange={(v) => set("tipo", v)} disabled={lock}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Natureza de uso">
        <Select value={data.natureza_uso || "operacional"} onValueChange={(v) => set("natureza_uso", v)} disabled={lock}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {NATUREZAS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <div className="md:col-span-2 flex items-center gap-3">
        <Switch
          id="cf-dre"
          checked={data.impacta_dre !== false}
          onCheckedChange={(v) => set("impacta_dre", v)}
          disabled={lock}
        />
        <Label htmlFor="cf-dre" className="text-sm cursor-pointer">Impacta a DRE</Label>
      </div>

      {data.impacta_dre !== false && (
        <>
          <Field label="Grupo no DRE">
            <Select value={data.grupo_dre || ""} onValueChange={(v) => set("grupo_dre", v)} disabled={lock}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {GRUPOS_DRE.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo no DRE">
            <Select value={data.tipo_dre || ""} onValueChange={(v) => set("tipo_dre", v)} disabled={lock}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TIPOS_DRE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ordem no DRE">
            <Input type="number" value={data.ordem_dre ?? ""} onChange={(e) => set("ordem_dre", parseInt(e.target.value) || 0)} disabled={lock} />
          </Field>
        </>
      )}

      <Field label="Subgrupo (opcional)">
        <Input value={data.subgrupo || ""} onChange={(e) => set("subgrupo", e.target.value)} disabled={lock} />
      </Field>

      <div className="flex items-center gap-3">
        <Switch
          id="cf-loja"
          checked={!!data.loja_obrigatoria}
          onCheckedChange={(v) => set("loja_obrigatoria", v)}
          disabled={lock}
        />
        <Label htmlFor="cf-loja" className="text-sm cursor-pointer">Loja obrigatória</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="cf-cc"
          checked={!!data.centro_custo_obrigatorio}
          onCheckedChange={(v) => set("centro_custo_obrigatorio", v)}
          disabled={lock}
        />
        <Label htmlFor="cf-cc" className="text-sm cursor-pointer">Centro de custo obrigatório</Label>
      </div>

      <Field label="Regra de uso" className="md:col-span-2" hint="Quando usar e quando NÃO usar.">
        <Textarea rows={2} value={data.regra_uso || ""} onChange={(e) => set("regra_uso", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Descrição" className="md:col-span-2">
        <Textarea rows={2} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} disabled={readOnly} />
      </Field>
    </div>
  );
}