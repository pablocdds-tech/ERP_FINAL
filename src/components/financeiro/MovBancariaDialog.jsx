import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

const empty = () => ({
  conta_bancaria_id: "",
  tipo: "credito",
  data: new Date().toISOString().slice(0, 10),
  valor: 0,
  descricao: "",
  loja_id: "",
  categoria_id: "",
  centro_custo_id: "",
  origem_tipo: "manual",
});

export default function MovBancariaDialog({ open, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centros, setCentros] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData(empty());
      Promise.all([
        base44.entities.ContaBancaria.filter({ ativo: true }),
        base44.entities.CategoriaFinanceira.list(),
        base44.entities.CentroCusto.list(),
      ]).then(([c, cat, cc]) => { setContas(c); setCategorias(cat); setCentros(cc); });
    }
  }, [open]);

  const isCredito = data.tipo === "credito" || data.tipo === "transferencia_entrada";
  const cats = categorias.filter((c) => c.ativo !== false && (isCredito ? c.tipo === "receita" : c.tipo === "despesa"));

  const salvar = async () => {
    if (!data.conta_bancaria_id || !data.valor) return;
    setSaving(true);
    const cat = categorias.find((c) => c.id === data.categoria_id);
    await base44.entities.MovimentacaoBancaria.create({
      ...data,
      categoria_nome: cat?.nome,
    });
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Nova movimentação bancária</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Conta bancária" required className="col-span-2">
            <Select value={data.conta_bancaria_id} onValueChange={(v) => setData({ ...data, conta_bancaria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo" required>
            <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">Crédito (entrada)</SelectItem>
                <SelectItem value="debito">Débito (saída)</SelectItem>
                <SelectItem value="transferencia_entrada">Transferência (entrada)</SelectItem>
                <SelectItem value="transferencia_saida">Transferência (saída)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} />
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor ?? ""} onChange={(e) => setData({ ...data, valor: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Loja">
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
          </Field>
          <Field label="Categoria">
            <Select value={data.categoria_id || "__none__"} onValueChange={(v) => setData({ ...data, categoria_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Centro de custo">
            <Select value={data.centro_custo_id || "__none__"} onValueChange={(v) => setData({ ...data, centro_custo_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {centros.filter((c) => c.ativo !== false).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={2} value={data.descricao} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !data.conta_bancaria_id || !data.valor}>
            {saving ? "..." : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}