import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { criarMovimentoSocio, ROTULO_TIPO, TIPOS_QUE_AFETAM_DRE } from "@/lib/socio-empresa-service";
import { Loader2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function MovimentoSocioDialog({ open, tipo, onClose, onSaved }) {
  const [data, setData] = useState({
    data: today(), valor: "", loja_id: "", conta_bancaria_id: "",
    categoria_id: "", descricao: "", observacoes: "", comprovante_url: "",
  });
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData({
      data: today(), valor: "", loja_id: "", conta_bancaria_id: "",
      categoria_id: "", descricao: "", observacoes: "", comprovante_url: "",
    });
    Promise.all([
      base44.entities.ContaBancaria.list(),
      base44.entities.CategoriaFinanceira.list(),
    ]).then(([cb, cf]) => { setContas(cb); setCategorias(cf); });
  }, [open]);

  if (!tipo) return null;
  const afetaDre = TIPOS_QUE_AFETAM_DRE.has(tipo);

  const tipoNatureza = (() => {
    // Sugere se a conta deveria ser PF ou PJ para este tipo
    if (["despesa_empresa_paga_pf", "uso_cheque_especial_pf", "recebimento_empresa_em_pf", "juros_pf_empresa"].includes(tipo)) return "pf";
    if (["despesa_pessoal_paga_empresa", "reembolso_socio", "retirada_socio", "devolucao_socio"].includes(tipo)) return "pj";
    return null;
  })();

  const contasFiltradas = tipoNatureza ? contas.filter((c) => (c.natureza || "pj") === tipoNatureza) : contas;
  const categoriasTipo = tipo === "recebimento_empresa_em_pf" ? "receita" : "despesa";
  const categoriasFiltradas = afetaDre ? categorias.filter((c) => c.tipo === categoriasTipo) : categorias;

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setData((d) => ({ ...d, comprovante_url: file_url }));
    } catch (e) {
      toast.error("Falha no upload do comprovante");
    } finally { setUploading(false); }
  };

  const salvar = async () => {
    const v = parseFloat(data.valor);
    if (!v || v <= 0) { toast.error("Informe um valor."); return; }
    if (afetaDre && !data.categoria_id) { toast.error("Selecione a categoria (afeta DRE)."); return; }
    setSaving(true);
    try {
      await criarMovimentoSocio({ ...data, valor: v, tipo });
      toast.success("Movimento registrado.");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error("Falha: " + (e?.message || "erro"));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{ROTULO_TIPO[tipo]}</DialogTitle>
          <DialogDescription>
            {afetaDre
              ? "Este lançamento gera registro na DRE e impacta o saldo Sócio x Empresa."
              : "Este lançamento NÃO entra na DRE — afeta apenas o saldo Sócio x Empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" required>
            <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} />
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor} onChange={(e) => setData({ ...data, valor: e.target.value })} />
          </Field>
          <Field label="Loja">
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
          </Field>
          <Field label={tipoNatureza === "pf" ? "Conta PF envolvida" : tipoNatureza === "pj" ? "Conta PJ envolvida" : "Conta envolvida"}>
            <Select value={data.conta_bancaria_id} onValueChange={(v) => setData({ ...data, conta_bancaria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {contasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} {c.natureza === "pf" ? "(PF)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {afetaDre && (
            <Field label="Categoria" required className="col-span-2">
              <Select value={data.categoria_id} onValueChange={(v) => setData({ ...data, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Descrição" className="col-span-2">
            <Input value={data.descricao} onChange={(e) => setData({ ...data, descricao: e.target.value })} placeholder={ROTULO_TIPO[tipo]} />
          </Field>
          <Field label="Observação" className="col-span-2">
            <Textarea rows={2} value={data.observacoes} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
          </Field>
          <Field label="Comprovante" className="col-span-2">
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => handleUpload(e.target.files?.[0])} />
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {data.comprovante_url && (
                <a href={data.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  ver
                </a>
              )}
            </div>
          </Field>
        </div>

        {!afetaDre && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Aporte/retirada/reembolso/devolução não geram receita nem despesa operacional na DRE.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}