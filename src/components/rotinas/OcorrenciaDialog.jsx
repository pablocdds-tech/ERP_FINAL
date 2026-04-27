import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, ArrowRight } from "lucide-react";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import StatusBadge from "./StatusBadge";
import ComentariosTimeline from "./ComentariosTimeline";
import { criarOcorrencia, ocorrenciaParaTarefa } from "@/lib/rotinas-service";

const empty = () => ({
  titulo: "", descricao: "", tipo: "operacional", severidade: "media",
  status: "aberta", fotos: [], origem_tipo: "manual",
});

export default function OcorrenciaDialog({ open, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [colaboradores, setColaboradores] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [convert, setConvert] = useState({ open: false, prazo: "", responsavel_id: "" });
  const isEdit = !!record?.id;

  useEffect(() => {
    if (!open) return;
    setData(record ? { ...record, fotos: record.fotos || [] } : empty());
    base44.entities.Colaborador.filter({ status: "ativo" }).then(setColaboradores);
  }, [open, record]);

  const tirarFoto = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setData((d) => ({ ...d, fotos: [...(d.fotos || []), file_url] }));
      setUploading(false);
    };
    input.click();
  };

  const salvar = async () => {
    if (!data.titulo) return;
    if (isEdit) {
      const { id, ...rest } = data;
      const updates = { ...rest };
      if (rest.status === "resolvida" && !rest.resolvida_em) {
        updates.resolvida_em = new Date().toISOString();
        try { updates.resolvida_por = (await base44.auth.me())?.email; } catch { /* */ }
      }
      await base44.entities.OcorrenciaOperacional.update(id, updates);
    } else {
      await criarOcorrencia(data);
    }
    onSaved?.(); onClose?.();
  };

  const transformarTarefa = async () => {
    if (!record?.id || !convert.responsavel_id) return;
    await ocorrenciaParaTarefa({
      ocorrencia: record,
      responsavel_id: convert.responsavel_id,
      prazo: convert.prazo,
    });
    setConvert({ open: false, prazo: "", responsavel_id: "" });
    onSaved?.(); onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Ocorrência" : "Nova ocorrência"}
            {isEdit && <StatusBadge status={data.status} kind="ocorrencia" />}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" required className="col-span-2">
            <Input value={data.titulo || ""} onChange={(e) => setData({ ...data, titulo: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="qualidade">Qualidade</SelectItem>
                <SelectItem value="seguranca">Segurança</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="auditoria">Auditoria</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Severidade">
            <Select value={data.severidade} onValueChange={(v) => setData({ ...data, severidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
          <Field label="Responsável">
            <Select value={data.responsavel_id || "__none__"} onValueChange={(v) => setData({ ...data, responsavel_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {isEdit && (
            <Field label="Status" className="col-span-2">
              <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={3} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
          </Field>
          {data.status === "resolvida" && (
            <Field label="Resolução / Tratativa" className="col-span-2">
              <Textarea rows={2} value={data.resolucao || ""} onChange={(e) => setData({ ...data, resolucao: e.target.value })} />
            </Field>
          )}
          <div className="col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={tirarFoto} disabled={uploading}>
              <Camera className="w-3.5 h-3.5 mr-1" /> {uploading ? "..." : "Adicionar foto"}
            </Button>
            {(data.fotos || []).length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {data.fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} alt="" className="w-full h-20 object-cover rounded border border-border" />
                    <button onClick={() => setData({ ...data, fotos: data.fotos.filter((_, j) => j !== i) })}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isEdit && record?.id && (
          <div className="mt-4">
            <ComentariosTimeline entidade="OcorrenciaOperacional" entidade_id={record.id} />
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {isEdit && !record.tarefa_id && (
            <Button variant="outline" size="sm" onClick={() => setConvert({ ...convert, open: !convert.open })}>
              <ArrowRight className="w-3.5 h-3.5 mr-1" /> Gerar tarefa
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={salvar} disabled={!data.titulo}>Salvar</Button>
        </DialogFooter>

        {convert.open && (
          <div className="border-t border-border pt-3 mt-2 space-y-2">
            <div className="text-xs font-medium">Atribuir tarefa a partir desta ocorrência</div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={convert.responsavel_id || ""} onValueChange={(v) => setConvert({ ...convert, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={convert.prazo} onChange={(e) => setConvert({ ...convert, prazo: e.target.value })} />
            </div>
            <Button size="sm" onClick={transformarTarefa} disabled={!convert.responsavel_id}>Confirmar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}