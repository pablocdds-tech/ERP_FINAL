import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Field from "@/components/cadastros/Field";

/**
 * Cadastro simples de justificativa/atestado pelo gestor.
 * Reaproveita SolicitacaoRH e os TipoAbono existentes. Nasce como "pendente".
 */
export default function NovaJustificativaDialog({ open, onOpenChange, colaboradores, tiposAbono, onSaved }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [colaboradorId, setColaboradorId] = useState("");
  const [dataRef, setDataRef] = useState(hoje);
  const [tipoAbonoId, setTipoAbonoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const reset = () => {
    setColaboradorId(""); setDataRef(hoje); setTipoAbonoId("");
    setDescricao(""); setAnexoUrl(""); setErro("");
  };

  const handleAnexo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoAnexo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAnexoUrl(file_url);
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const salvar = async () => {
    if (!colaboradorId || !dataRef || !tipoAbonoId || !descricao.trim()) {
      setErro("Preencha colaborador, data, tipo e descrição.");
      return;
    }
    setSalvando(true);
    const colab = colaboradores.find((c) => c.id === colaboradorId);
    const tipo = tiposAbono.find((t) => t.id === tipoAbonoId);
    await base44.entities.SolicitacaoRH.create({
      colaborador_id: colaboradorId,
      loja_id: colab?.loja_id || "",
      tipo: "justificativa",
      categoria: tipo?.categoria || "outro",
      tipo_abono_id: tipoAbonoId,
      data_solicitacao: hoje,
      data_referencia: dataRef,
      descricao: descricao.trim(),
      anexo_url: anexoUrl || undefined,
      status: "pendente",
      origem: "gestor_justificativa",
    });
    setSalvando(false);
    reset();
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova justificativa / atestado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Colaborador" required>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data da ocorrência" required>
            <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} />
          </Field>
          <Field label="Tipo de abono / justificativa" required>
            <Select value={tipoAbonoId} onValueChange={setTipoAbonoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tiposAbono.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Cadastre tipos de abono em Configurações do Ponto.</div>}
                {tiposAbono.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição / motivo" required>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: atestado de 1 dia, consulta médica, etc." />
          </Field>
          <Field label="Anexo (opcional)">
            <Input type="file" onChange={handleAnexo} disabled={enviandoAnexo} />
            {enviandoAnexo && <span className="text-xs text-muted-foreground">Enviando...</span>}
            {anexoUrl && <a href={anexoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Arquivo anexado</a>}
          </Field>
          {erro && <div className="text-xs text-destructive">{erro}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || enviandoAnexo}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}