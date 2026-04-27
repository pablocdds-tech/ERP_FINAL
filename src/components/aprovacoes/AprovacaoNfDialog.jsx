import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Field from "@/components/cadastros/Field";
import { aprovarNotaFiscalPendente, rejeitarNotaFiscalPendente } from "@/lib/aprovacoes-service";

export default function AprovacaoNfDialog({ open, record, onClose, onDone }) {
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [obs, setObs] = useState("");

  useEffect(() => { if (open && record) setData({ ...record }); }, [open, record]);
  if (!record) return null;

  const aprovar = async () => {
    setBusy(true);
    await aprovarNotaFiscalPendente({ ...record, ...data }, obs);
    setBusy(false); onDone?.(); onClose?.();
  };
  const rejeitar = async () => {
    const motivo = prompt("Motivo da rejeição:") || "";
    setBusy(true);
    await rejeitarNotaFiscalPendente(record, motivo);
    setBusy(false); onDone?.(); onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Aprovar nota fiscal pendente</DialogTitle></DialogHeader>

        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2">
          Dados extraídos por IA — confira antes de aprovar. Confiança: <strong>{record.ia_confianca ? `${Math.round(record.ia_confianca * 100)}%` : "—"}</strong>
          {record.ia_observacoes && <div className="mt-1">Observação IA: {record.ia_observacoes}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {record.arquivo_url && (
            <div>
              <Field label="Arquivo">
                <a href={record.arquivo_url} target="_blank" rel="noreferrer">
                  <img src={record.arquivo_url} alt="NF" className="w-full max-h-80 object-contain border rounded" />
                </a>
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 content-start">
            <Field label="Fornecedor" className="col-span-2">
              <Input value={data.fornecedor_nome || ""} onChange={(e) => setData({ ...data, fornecedor_nome: e.target.value })} />
            </Field>
            <Field label="CNPJ">
              <Input value={data.fornecedor_cnpj || ""} onChange={(e) => setData({ ...data, fornecedor_cnpj: e.target.value })} />
            </Field>
            <Field label="Número">
              <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} />
            </Field>
            <Field label="Série">
              <Input value={data.serie || ""} onChange={(e) => setData({ ...data, serie: e.target.value })} />
            </Field>
            <Field label="Data emissão">
              <Input type="date" value={data.data_emissao || ""} onChange={(e) => setData({ ...data, data_emissao: e.target.value })} />
            </Field>
            <Field label="Valor total" className="col-span-2">
              <Input type="number" step="0.01" value={data.valor_total ?? ""} onChange={(e) => setData({ ...data, valor_total: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Chave de acesso" className="col-span-2">
              <Input value={data.chave_acesso || ""} onChange={(e) => setData({ ...data, chave_acesso: e.target.value })} />
            </Field>
            <Field label="Observações de aprovação" className="col-span-2">
              <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </Field>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="destructive" onClick={rejeitar} disabled={busy}>Rejeitar</Button>
          <Button onClick={aprovar} disabled={busy}>{busy ? "..." : "Aprovar e criar NF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}