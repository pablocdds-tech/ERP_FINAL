import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import { toast } from "sonner";

const empty = (tipoInicial) => ({
  item_tipo: tipoInicial === "ambos" ? "insumo" : tipoInicial,
  nome: "",
  codigo: "",
  categoria: "",
  unidade_medida: "",
  custo_referencia: "",
  preco_venda: "",
});

export default function ItemQuickDialog({ open, tipo = "ambos", onClose, onCreated }) {
  const [data, setData] = useState(empty(tipo));
  const [unidades, setUnidades] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData(empty(tipo));
      base44.entities.UnidadeMedida.filter({ ativo: true }).then((u) => setUnidades(u || []));
    }
  }, [open, tipo]);

  const tipoLocked = tipo !== "ambos";

  const salvar = async () => {
    if (!data.nome.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    setSaving(true);
    try {
      let created;
      if (data.item_tipo === "insumo") {
        created = await base44.entities.Insumo.create({
          nome: data.nome,
          codigo: data.codigo || undefined,
          categoria: data.categoria || undefined,
          unidade_medida: data.unidade_medida || undefined,
          custo_referencia: data.custo_referencia ? Number(data.custo_referencia) : undefined,
          ativo: true,
        });
      } else {
        created = await base44.entities.Produto.create({
          nome: data.nome,
          codigo: data.codigo || undefined,
          categoria: data.categoria || undefined,
          unidade_medida: data.unidade_medida || undefined,
          preco_venda: data.preco_venda ? Number(data.preco_venda) : undefined,
          ativo: true,
        });
      }
      toast.success(`${data.item_tipo === "insumo" ? "Insumo" : "Produto"} cadastrado.`);
      onCreated?.({ item_tipo: data.item_tipo, item_id: created.id, item_nome: created.nome });
      onClose?.();
    } catch {
      toast.error("Erro ao cadastrar item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro rápido de item</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Tipo" required>
            <Select value={data.item_tipo} onValueChange={(v) => setData({ ...data, item_tipo: v })} disabled={tipoLocked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="insumo">Insumo (matéria-prima)</SelectItem>
                <SelectItem value="produto">Produto (revenda)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome" required>
            <Input autoFocus value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código">
              <Input value={data.codigo} onChange={(e) => setData({ ...data, codigo: e.target.value })} />
            </Field>
            <Field label="Categoria">
              <Input value={data.categoria} onChange={(e) => setData({ ...data, categoria: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidade">
              <Select value={data.unidade_medida || "__none__"} onValueChange={(v) => setData({ ...data, unidade_medida: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {unidades.map((u) => <SelectItem key={u.id} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {data.item_tipo === "insumo" ? (
              <Field label="Custo ref. (R$)">
                <Input type="number" step="0.01" value={data.custo_referencia} onChange={(e) => setData({ ...data, custo_referencia: e.target.value })} />
              </Field>
            ) : (
              <Field label="Preço venda (R$)">
                <Input type="number" step="0.01" value={data.preco_venda} onChange={(e) => setData({ ...data, preco_venda: e.target.value })} />
              </Field>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !data.nome.trim()}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}