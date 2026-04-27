import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import Field from "@/components/cadastros/Field";
import { baixarDocumento, listarBaixas } from "@/lib/financeiro-service";
import HistoricoPagamentos from "./HistoricoPagamentos";

export default function BaixaDialog({ open, documento, documento_tipo, onClose, onSaved }) {
  const [doc, setDoc] = useState(null);
  const [baixas, setBaixas] = useState([]);
  const [contas, setContas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [data, setData] = useState({
    data: new Date().toISOString().slice(0, 10),
    valor: 0,
    conta_bancaria_id: "",
    forma_pagamento_id: "",
    observacoes: "",
  });

  const isPagar = documento_tipo === "conta_pagar";
  const total = Number(doc?.valor || 0);
  const pago = Number((isPagar ? doc?.valor_pago : doc?.valor_recebido) || 0);
  const saldo = Math.max(0, Number((total - pago).toFixed(2)));
  const quitado = saldo <= 0.001;

  const recarregar = useCallback(async () => {
    if (!documento?.id) return;
    const Ent = isPagar ? base44.entities.ContaPagar : base44.entities.ContaReceber;
    const [d, bx] = await Promise.all([Ent.get(documento.id), listarBaixas(documento.id)]);
    setDoc(d);
    setBaixas(bx);
  }, [documento, isPagar]);

  useEffect(() => {
    if (!open || !documento) return;
    setShowForm(false);
    setErro("");
    Promise.all([
      base44.entities.ContaBancaria.filter({ ativo: true }),
      base44.entities.FormaPagamento.filter({ ativo: true }),
    ]).then(([c, f]) => { setContas(c); setFormas(f); });
    recarregar();
  }, [open, documento, recarregar]);

  useEffect(() => {
    if (showForm) {
      setData({
        data: new Date().toISOString().slice(0, 10),
        valor: saldo,
        conta_bancaria_id: "",
        forma_pagamento_id: "",
        observacoes: "",
      });
      setErro("");
    }
  }, [showForm, saldo]);

  const salvar = async () => {
    if (!doc || !data.valor || !data.conta_bancaria_id) return;
    setSaving(true);
    setErro("");
    try {
      await baixarDocumento({
        documento: doc,
        documento_tipo,
        valor: data.valor,
        data: data.data,
        conta_bancaria_id: data.conta_bancaria_id,
        forma_pagamento_id: data.forma_pagamento_id,
        observacoes: data.observacoes,
      });
      await recarregar();
      onSaved?.();
      setShowForm(false);
    } catch (e) {
      setErro(e.message || "Erro ao registrar pagamento");
    }
    setSaving(false);
  };

  const handleHistChange = async () => {
    await recarregar();
    onSaved?.();
  };

  if (!documento || !doc) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isPagar ? "Pagamentos" : "Recebimentos"} — {doc.descricao || "Documento"}</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/40 rounded p-3 mb-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-mono font-semibold">R$ {total.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{isPagar ? "Pago" : "Recebido"}</div>
            <div className="font-mono font-semibold">R$ {pago.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Saldo</div>
            <div className={`font-mono font-semibold ${quitado ? "text-emerald-600" : "text-amber-600"}`}>R$ {saldo.toFixed(2)}</div>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">Histórico</div>
          {!showForm && !quitado && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Registrar pagamento
            </Button>
          )}
        </div>

        <HistoricoPagamentos
          baixas={baixas}
          contas={contas}
          formas={formas}
          documento={doc}
          documento_tipo={documento_tipo}
          onChanged={handleHistChange}
        />

        {showForm && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="text-xs font-medium mb-3">Novo pagamento</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data" required>
                <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} />
              </Field>
              <Field label="Valor (R$)" required hint={`máx. R$ ${saldo.toFixed(2)}`}>
                <Input type="number" step="0.01" max={saldo} value={data.valor}
                  onChange={(e) => setData({ ...data, valor: parseFloat(e.target.value) || 0 })} />
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
            {erro && <div className="text-xs text-destructive mt-2">{erro}</div>}
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={salvar} disabled={saving || !data.valor || !data.conta_bancaria_id}>
                {saving ? "..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}