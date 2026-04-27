import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/cadastros/Field";
import { aprovarFechamentoPendente, rejeitarFechamentoPendente } from "@/lib/aprovacoes-service";

export default function AprovacaoFechamentoDialog({ open, record, onClose, onDone }) {
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && record) setData({
      data_referencia: record.data_referencia,
      vendas_por_canal: record.vendas_por_canal || [],
      vendas_por_pagamento: record.vendas_por_pagamento || [],
    });
  }, [open, record]);
  if (!record) return null;

  const updCanal = (i, v) => setData((d) => ({ ...d, vendas_por_canal: d.vendas_por_canal.map((c, idx) => idx === i ? { ...c, valor: v } : c) }));
  const updPag = (i, v) => setData((d) => ({ ...d, vendas_por_pagamento: d.vendas_por_pagamento.map((p, idx) => idx === i ? { ...p, valor_declarado: v } : p) }));

  const aprovar = async () => {
    setBusy(true);
    await aprovarFechamentoPendente({ ...record, ...data });
    setBusy(false); onDone?.(); onClose?.();
  };
  const rejeitar = async () => {
    const motivo = prompt("Motivo:") || "";
    setBusy(true);
    await rejeitarFechamentoPendente(record, motivo);
    setBusy(false); onDone?.(); onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Aprovar fechamento de vendas pendente</DialogTitle></DialogHeader>

        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2">
          Dados extraídos por IA. Confiança: <strong>{record.ia_confianca ? `${Math.round(record.ia_confianca * 100)}%` : "—"}</strong>
          {record.ia_observacoes && <div className="mt-1">Observação IA: {record.ia_observacoes}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {record.arquivo_url && (
            <a href={record.arquivo_url} target="_blank" rel="noreferrer">
              <img src={record.arquivo_url} alt="" className="w-full max-h-80 object-contain border rounded" />
            </a>
          )}
          <div className="space-y-3">
            <Field label="Data referência">
              <Input type="date" value={data.data_referencia || ""} onChange={(e) => setData({ ...data, data_referencia: e.target.value })} />
            </Field>
            <div>
              <div className="text-xs font-medium mb-1">Vendas por canal</div>
              {(data.vendas_por_canal || []).map((c, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={c.canal_nome || ""} className="flex-1" disabled />
                  <Input type="number" step="0.01" value={c.valor || 0} onChange={(e) => updCanal(i, parseFloat(e.target.value) || 0)} className="w-32" />
                </div>
              ))}
              {(!data.vendas_por_canal || data.vendas_por_canal.length === 0) && <div className="text-xs text-muted-foreground">—</div>}
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Vendas por forma de pagamento</div>
              {(data.vendas_por_pagamento || []).map((p, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input value={p.forma_nome || ""} className="flex-1" disabled />
                  <Input type="number" step="0.01" value={p.valor_declarado || 0} onChange={(e) => updPag(i, parseFloat(e.target.value) || 0)} className="w-32" />
                </div>
              ))}
              {(!data.vendas_por_pagamento || data.vendas_por_pagamento.length === 0) && <div className="text-xs text-muted-foreground">—</div>}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="destructive" onClick={rejeitar} disabled={busy}>Rejeitar</Button>
          <Button onClick={aprovar} disabled={busy}>{busy ? "..." : "Aprovar e criar fechamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}