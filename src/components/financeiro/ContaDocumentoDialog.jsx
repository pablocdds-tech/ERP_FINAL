import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { registrarAuditoria } from "@/lib/financeiro-service";

// Dialog reutilizado para ContaPagar e ContaReceber.
// modo: "create" | "edit" | "view"
// documento_tipo: "conta_pagar" | "conta_receber"
const empty = (tipo) => ({
  descricao: "",
  loja_id: "",
  categoria_id: "",
  centro_custo_id: "",
  valor: 0,
  data_emissao: new Date().toISOString().slice(0, 10),
  data_vencimento: new Date().toISOString().slice(0, 10),
  documento: "",
  observacoes: "",
  status: "aberta",
  ...(tipo === "conta_pagar" ? { fornecedor_id: "" } : { cliente: "" }),
});

export default function ContaDocumentoDialog({ open, mode, record, documento_tipo, onClose, onSaved }) {
  const isPagar = documento_tipo === "conta_pagar";
  const [data, setData] = useState(empty(documento_tipo));
  const [categorias, setCategorias] = useState([]);
  const [centros, setCentros] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";
  const isPaid = data.status === "paga" || data.status === "recebida";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty(documento_tipo));
      Promise.all([
        base44.entities.CategoriaFinanceira.list(),
        base44.entities.CentroCusto.list(),
        isPagar ? base44.entities.Fornecedor.list() : Promise.resolve([]),
      ]).then(([cat, cc, fs]) => {
        setCategorias(cat); setCentros(cc); setFornecedores(fs);
      });
    }
  }, [open, record, documento_tipo, isPagar]);

  const cats = useMemo(() => categorias.filter((c) =>
    c.ativo !== false && (isPagar ? c.tipo === "despesa" : c.tipo === "receita")
  ), [categorias, isPagar]);

  const centrosLoja = useMemo(() => centros.filter((c) =>
    c.ativo !== false && (!c.loja_id || c.loja_id === data.loja_id)
  ), [centros, data.loja_id]);

  const set = (k, v) => setData({ ...data, [k]: v });

  const salvar = async () => {
    if (!data.valor || !data.data_vencimento) return;
    setSaving(true);
    const Ent = isPagar ? base44.entities.ContaPagar : base44.entities.ContaReceber;
    const ent = isPagar ? "ContaPagar" : "ContaReceber";

    if (record?.id) {
      const { id, ...rest } = data;
      const before = record;
      const updated = await Ent.update(id, rest);
      await registrarAuditoria({
        entidade: ent,
        entidade_id: id,
        acao: isPaid ? "edicao_paga" : "edicao",
        snapshot_antes: before,
        snapshot_depois: updated,
      });
    } else {
      const created = await Ent.create(data);
      await registrarAuditoria({
        entidade: ent,
        entidade_id: created.id,
        acao: "criacao",
        snapshot_depois: created,
      });
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isView ? (isPagar ? "Conta a pagar" : "Conta a receber") :
             record ? "Editar lançamento" : (isPagar ? "Nova conta a pagar" : "Nova conta a receber")}
          </DialogTitle>
        </DialogHeader>

        {isPaid && !isView && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2">
            Este lançamento já foi {isPagar ? "pago" : "recebido"}. Toda alteração ficará registrada na auditoria.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Descrição" required className="md:col-span-2">
            <Input value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} disabled={isView} />
          </Field>
          {isPagar ? (
            <Field label="Fornecedor">
              <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => set("fornecedor_id", v === "__none__" ? "" : v)} disabled={isView}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Cliente">
              <Input value={data.cliente || ""} onChange={(e) => set("cliente", e.target.value)} disabled={isView} />
            </Field>
          )}
          <Field label="Loja" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} />
          </Field>
          <Field label="Categoria" required>
            <Select value={data.categoria_id || ""} onValueChange={(v) => set("categoria_id", v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Centro de custo">
            <Select value={data.centro_custo_id || "__none__"} onValueChange={(v) => set("centro_custo_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {centrosLoja.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor ?? ""} onChange={(e) => set("valor", parseFloat(e.target.value) || 0)} disabled={isView} />
          </Field>
          <Field label="Data emissão">
            <Input type="date" value={data.data_emissao || ""} onChange={(e) => set("data_emissao", e.target.value)} disabled={isView} />
          </Field>
          <Field label="Data vencimento" required>
            <Input type="date" value={data.data_vencimento || ""} onChange={(e) => set("data_vencimento", e.target.value)} disabled={isView} />
          </Field>
          <Field label="Documento (NF/Boleto)" className="md:col-span-2">
            <Input value={data.documento || ""} onChange={(e) => set("documento", e.target.value)} disabled={isView} />
          </Field>
          <Field label="Observações" className="md:col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={isView} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && (
            <Button onClick={salvar} disabled={saving || !data.valor || !data.data_vencimento}>
              {saving ? "..." : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}