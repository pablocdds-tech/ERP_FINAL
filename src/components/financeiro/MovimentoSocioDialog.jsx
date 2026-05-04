import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import {
  criarMovimentoSocio, ROTULO_TIPO, TIPOS_QUE_AFETAM_DRE,
  SUGESTAO_GERAR_CP, SUGESTAO_GERAR_CR,
} from "@/lib/socio-empresa-service";
import { Loader2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

// Sugere a natureza esperada da conta envolvida para cada tipo
const NATUREZA_SUGERIDA = {
  despesa_empresa_paga_pela_pf: "PF_USO_OPERACIONAL",
  despesa_pessoal_paga_pela_empresa: "PJ",
  recebimento_empresa_em_pf: "PF_USO_OPERACIONAL",
  aporte_socio: "PJ",
  emprestimo_socio: "PJ",
  uso_cheque_especial_pf: "PF_USO_OPERACIONAL",
  juros_cheque_especial_pf: "PF_USO_OPERACIONAL",
  reembolso_ao_socio: "PJ",
  retirada_socio: "PJ",
  devolucao_socio_empresa: "PJ",
  acerto_saldo: null,
};

export default function MovimentoSocioDialog({ open, tipo, onClose, onSaved }) {
  const [data, setData] = useState({});
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !tipo) return;
    setData({
      data: today(),
      valor: "",
      socio_nome: "Sócio",
      loja_id: "",
      conta_origem_id: "",
      conta_destino_id: "",
      categoria_id: "",
      descricao: "",
      observacoes: "",
      comprovante_url: "",
      gerar_conta_pagar: SUGESTAO_GERAR_CP.has(tipo),
      gerar_conta_receber: SUGESTAO_GERAR_CR.has(tipo),
      data_vencimento: "",
    });
    Promise.all([
      base44.entities.ContaBancaria.list(),
      base44.entities.CategoriaFinanceira.list(),
    ]).then(([cb, cf]) => { setContas(cb); setCategorias(cf); });
  }, [open, tipo]);

  if (!tipo) return null;
  const afetaDre = TIPOS_QUE_AFETAM_DRE.has(tipo);
  const naturezaSugerida = NATUREZA_SUGERIDA[tipo];

  const naturezaOf = (c) => c.natureza || (c.tipo === "cartao_pf" || c.tipo === "cheque_especial_pf" ? "PF_USO_OPERACIONAL" : "PJ");
  const contasFiltradas = naturezaSugerida
    ? contas.filter((c) => naturezaOf(c) === naturezaSugerida)
    : contas.filter((c) => naturezaOf(c) !== "VIRTUAL_INTERNO");

  // Categoria DRE: receita só para recebimento; demais com impacto = despesa
  const categoriasTipo = tipo === "recebimento_empresa_em_pf" ? "receita" : "despesa";
  const categoriasFiltradas = categorias.filter((c) => c.tipo === categoriasTipo);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setData((d) => ({ ...d, comprovante_url: file_url }));
    } catch {
      toast.error("Falha no upload do comprovante");
    } finally { setUploading(false); }
  };

  const salvar = async () => {
    const v = parseFloat(data.valor);
    if (!v || v <= 0) { toast.error("Informe um valor."); return; }
    if (afetaDre && !data.categoria_id) { toast.error("Selecione a categoria (afeta DRE)."); return; }
    setSaving(true);
    try {
      await criarMovimentoSocio({ ...data, valor: v, tipo_movimento: tipo });
      toast.success("Movimento registrado.");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error("Falha: " + (e?.message || "erro"));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose?.()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ROTULO_TIPO[tipo]}</DialogTitle>
          <DialogDescription>
            {afetaDre
              ? "Este lançamento gera registro na DRE e impacta o saldo Sócio x Empresa."
              : "Este lançamento NÃO entra na DRE como receita/despesa operacional — afeta apenas o saldo Sócio x Empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} />
          </Field>
          <Field label="Valor (R$)" required>
            <Input type="number" step="0.01" value={data.valor ?? ""} onChange={(e) => setData({ ...data, valor: e.target.value })} />
          </Field>
          <Field label="Sócio">
            <Input value={data.socio_nome || ""} onChange={(e) => setData({ ...data, socio_nome: e.target.value })} placeholder="Nome do sócio" />
          </Field>
          <Field label="Loja">
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
          </Field>

          <Field label={naturezaSugerida === "PF_USO_OPERACIONAL" ? "Conta PF de origem" : "Conta de origem"}>
            <Select value={data.conta_origem_id || ""} onValueChange={(v) => setData({ ...data, conta_origem_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {contasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Conta de destino (opcional)">
            <Select value={data.conta_destino_id || ""} onValueChange={(v) => setData({ ...data, conta_destino_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {contas.filter((c) => naturezaOf(c) !== "VIRTUAL_INTERNO").map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={`Categoria${afetaDre ? " (DRE)" : " (opcional)"}`} required={afetaDre} className="col-span-2">
            <Select value={data.categoria_id || ""} onValueChange={(v) => setData({ ...data, categoria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(afetaDre ? categoriasFiltradas : categorias).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} <span className="text-xs text-muted-foreground">({c.tipo})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Descrição" className="col-span-2">
            <Input value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} placeholder={ROTULO_TIPO[tipo]} />
          </Field>

          <Field label="Observação" className="col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
          </Field>

          <Field label="Comprovante" className="col-span-2">
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => handleUpload(e.target.files?.[0])} />
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {data.comprovante_url && (
                <a href={data.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver</a>
              )}
            </div>
          </Field>

          <div className="col-span-2 rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="text-xs font-medium">Geração automática</div>
            <div className="flex items-center gap-3">
              <Switch
                id="gen-cp"
                checked={!!data.gerar_conta_pagar}
                onCheckedChange={(v) => setData({ ...data, gerar_conta_pagar: v })}
              />
              <Label htmlFor="gen-cp" className="text-sm cursor-pointer">
                Gerar Conta a Pagar em aberto (favorecido: sócio)
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="gen-cr"
                checked={!!data.gerar_conta_receber}
                onCheckedChange={(v) => setData({ ...data, gerar_conta_receber: v })}
              />
              <Label htmlFor="gen-cr" className="text-sm cursor-pointer">
                Gerar Conta a Receber em aberto (devedor: sócio)
              </Label>
            </div>
            {(data.gerar_conta_pagar || data.gerar_conta_receber) && (
              <Field label="Vencimento da CP/CR">
                <Input type="date" value={data.data_vencimento || ""} onChange={(e) => setData({ ...data, data_vencimento: e.target.value })} />
              </Field>
            )}
          </div>
        </div>

        {!afetaDre && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Aporte/empréstimo, retirada, reembolso, devolução e acerto de saldo NÃO entram como receita ou despesa operacional na DRE.
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