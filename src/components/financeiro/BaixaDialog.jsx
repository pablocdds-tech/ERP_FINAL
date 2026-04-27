import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import { baixarDocumento } from "@/lib/financeiro-service";

export default function BaixaDialog({ open, documento, documento_tipo, onClose, onSaved }) {
  const [data, setData] = useState({
    data: new Date().toISOString().slice(0, 10),
    valor: 0,
    conta_bancaria_id: "",
    forma_pagamento_id: "",
    observacoes: "",
  });
  const [contas, setContas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && documento) {
      const restante = Number(documento.valor || 0) - Number((documento_tipo === "conta_pagar" ? documento.valor_pago : documento.valor_recebido) || 0);
      setData({
        data: new Date().toISOString().slice(0, 10),
        valor: Number(restante.toFixed(2)),
        conta_bancaria_id: "",
        forma_pagamento_id: "",
        observacoes: "",
      });
      Promise.all([
        base44.entities.ContaBancaria.filter({ ativo: true }),
        base44.entities.FormaPagamento.filter({ ativo: true }),
      ]).then(([c, f]) => { setContas(c); setFormas(f); });
    }
  }, [open, documento, documento_tipo]);

  const salvar = async () => {
    if (!documento || !data.valor || !data.conta_bancaria_id) return;
    setSaving(true);
    await baixarDocumento({
      documento,
      documento_tipo,
      valor: data.valor,
      data: data.data,
      conta_bancaria_id: data.conta_bancaria_id,
      forma_pagamento_id: data.forma_pagamento_id,
      observacoes: data.observacoes,
    });
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  if (!documento) return null;
  const isPagar = documento_tipo === "conta_pagar";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isPagar ? "Baixar pagamento" : "Baixar recebimento"}</DialogTitle></DialogHeader>
        <div className="text-xs bg-muted/40 rounded p-3 mb-3">
          <div><span className="text-muted-foreground">Documento:</span> {documento.descricao || "—"}</div>
          <div><span className="text-muted-foreground">Valor total:</span> R$ {Number(documento.valor || 0).toFixed(2)}</div>
          <div><span className="text-muted-foreground">Já {isPagar ? "pago" : "recebido"}:</span> R$ {Number((isPagar ? documento.valor_pago : documento.valor_recebido) || 0).toFixed(2)}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data" required>
            <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} />
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor} onChange={(e) => setData({ ...data, valor: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Conta bancária" required className="col-span-2">
            <Select value={data.conta_bancaria_id || ""} onValueChange={(v) => setData({ ...data, conta_bancaria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Forma de pagamento" className="col-span-2">
            <Select value={data.forma_pagamento_id || "__none__"} onValueChange={(v) => setData({ ...data, forma_pagamento_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {formas.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={2} value={data.observacoes} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !data.valor || !data.conta_bancaria_id}>
            {saving ? "..." : "Confirmar baixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}