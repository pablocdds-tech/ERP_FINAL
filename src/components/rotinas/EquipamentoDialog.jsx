import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import StatusBadge from "@/components/rotinas/StatusBadge";
import { format } from "date-fns";

const empty = () => ({ nome: "", tipo: "", ativo: true });

export default function EquipamentoDialog({ open, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [fornecedores, setFornecedores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const isEdit = !!record?.id;

  useEffect(() => {
    if (!open) return;
    setData(record ? { ...record } : empty());
    base44.entities.Fornecedor.filter({ ativo: true }).then(setFornecedores);
    if (record?.id) {
      base44.entities.OrdemServico.filter({ equipamento_id: record.id }, "-data_abertura", 50).then(setHistorico);
    } else {
      setHistorico([]);
    }
  }, [open, record]);

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.Equipamento.update(id, rest); }
    else await base44.entities.Equipamento.create(data);
    onSaved?.(); onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Equipamento" : "Novo equipamento"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" required className="col-span-2">
            <Input value={data.nome || ""} onChange={(e) => setData({ ...data, nome: e.target.value })} />
          </Field>
          <Field label="Código / Patrimônio">
            <Input value={data.codigo || ""} onChange={(e) => setData({ ...data, codigo: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Input value={data.tipo || ""} onChange={(e) => setData({ ...data, tipo: e.target.value })} placeholder="Ex: Forno, Geladeira" />
          </Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
          <Field label="Fornecedor">
            <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => setData({ ...data, fornecedor_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome_fantasia}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fabricante"><Input value={data.fabricante || ""} onChange={(e) => setData({ ...data, fabricante: e.target.value })} /></Field>
          <Field label="Modelo"><Input value={data.modelo || ""} onChange={(e) => setData({ ...data, modelo: e.target.value })} /></Field>
          <Field label="Nº Série"><Input value={data.numero_serie || ""} onChange={(e) => setData({ ...data, numero_serie: e.target.value })} /></Field>
          <Field label="Aquisição"><Input type="date" value={data.data_aquisicao || ""} onChange={(e) => setData({ ...data, data_aquisicao: e.target.value })} /></Field>
          <Field label="Valor"><Input type="number" step="0.01" value={data.valor_aquisicao || ""} onChange={(e) => setData({ ...data, valor_aquisicao: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Garantia até"><Input type="date" value={data.garantia_ate || ""} onChange={(e) => setData({ ...data, garantia_ate: e.target.value })} /></Field>
          <Field label="Última manutenção"><Input type="date" value={data.ultima_manutencao || ""} onChange={(e) => setData({ ...data, ultima_manutencao: e.target.value })} /></Field>
          <Field label="Próxima manutenção"><Input type="date" value={data.proxima_manutencao || ""} onChange={(e) => setData({ ...data, proxima_manutencao: e.target.value })} /></Field>
          <Field label="Observações" className="col-span-2"><Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} /></Field>
        </div>

        {isEdit && (
          <div className="border-t border-border pt-3 mt-2">
            <div className="text-xs font-medium mb-2">Histórico de manutenções ({historico.length})</div>
            {historico.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">Nenhuma OS registrada para este equipamento.</div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {historico.map((os) => (
                  <div key={os.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                    <span className="font-medium flex-1 truncate">{os.titulo}</span>
                    <span className="text-muted-foreground">{os.tipo}</span>
                    <span className="text-muted-foreground">{os.data_abertura ? format(new Date(os.data_abertura), "dd/MM/yy") : "—"}</span>
                    {os.custo_real != null && <span className="font-mono">R$ {Number(os.custo_real).toFixed(2)}</span>}
                    <StatusBadge status={os.status} kind="os" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={!data.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}