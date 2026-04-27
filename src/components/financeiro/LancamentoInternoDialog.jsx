import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import { gerarCupomNumero } from "@/lib/financeiro-service";

const empty = (tipo) => ({
  tipo: tipo || "debito",
  data: new Date().toISOString().slice(0, 10),
  loja_origem_id: "",
  loja_destino_id: "",
  valor: 0,
  descricao: "",
  categoria: "",
  documento_origem_tipo: "manual",
  observacoes: "",
  status: "aberto",
});

export default function LancamentoInternoDialog({ open, mode, record, tipoSugerido, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [lojas, setLojas] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty(tipoSugerido));
      base44.entities.Loja.list().then(setLojas);
    }
  }, [open, record, tipoSugerido]);

  const salvar = async () => {
    if (!data.loja_origem_id || !data.loja_destino_id || data.loja_origem_id === data.loja_destino_id) return;
    if (!data.valor) return;
    setSaving(true);
    let usuario_email;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }

    const payload = {
      ...data,
      cupom_numero: data.cupom_numero || gerarCupomNumero(),
      usuario_email,
    };
    if (record?.id) {
      const { id, ...rest } = payload;
      await base44.entities.LancamentoInterno.update(id, rest);
    } else {
      await base44.entities.LancamentoInterno.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isView ? "Lançamento interno" : record ? "Editar lançamento" : "Novo lançamento interno"}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded px-3 py-2">
          Este lançamento é <strong>virtual</strong>: não movimenta conta bancária real nem entra no fluxo de caixa real.
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <Field label="Tipo" required>
            <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debito">Débito (CD cobra loja)</SelectItem>
                <SelectItem value="credito">Crédito (CD credita loja)</SelectItem>
                <SelectItem value="liquidacao">Liquidação (loja paga)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={isView} />
          </Field>
          <Field label="De (origem)" required>
            <Select value={data.loja_origem_id || ""} onValueChange={(v) => setData({ ...data, loja_origem_id: v })} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Para (destino)" required>
            <Select value={data.loja_destino_id || ""} onValueChange={(v) => setData({ ...data, loja_destino_id: v })} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor ?? ""} onChange={(e) => setData({ ...data, valor: parseFloat(e.target.value) || 0 })} disabled={isView} />
          </Field>
          <Field label="Categoria">
            <Input placeholder="Ex: produção, repasse" value={data.categoria || ""} onChange={(e) => setData({ ...data, categoria: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Input value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} disabled={isView} />
          </Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} disabled={isView} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && (
            <Button onClick={salvar} disabled={saving || !data.loja_origem_id || !data.loja_destino_id || data.loja_origem_id === data.loja_destino_id || !data.valor}>
              {saving ? "..." : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}