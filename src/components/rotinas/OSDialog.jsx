import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, CheckCircle2 } from "lucide-react";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import StatusBadge from "@/components/rotinas/StatusBadge";
import ComentariosTimeline from "@/components/rotinas/ComentariosTimeline";
import { concluirOS } from "@/lib/rotinas-service";

const empty = () => ({
  titulo: "", descricao: "", tipo: "corretiva", status: "aberta", prioridade: "media",
  data_abertura: new Date().toISOString().slice(0, 10),
  fotos_antes: [], fotos_depois: [],
});

export default function OSDialog({ open, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [equipamentos, setEquipamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [conclusao, setConclusao] = useState({ open: false, custo_real: "", laudo: "", conta_pagar: false });
  const isEdit = !!record?.id;

  useEffect(() => {
    if (!open) return;
    setData(record ? { ...record, fotos_antes: record.fotos_antes || [], fotos_depois: record.fotos_depois || [] } : empty());
    setConclusao({ open: false, custo_real: record?.custo_previsto || "", laudo: "", conta_pagar: false });
    Promise.all([
      base44.entities.Equipamento.filter({ ativo: true }),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.Fornecedor.filter({ ativo: true }),
    ]).then(([e, c, f]) => { setEquipamentos(e); setColaboradores(c); setFornecedores(f); });
  }, [open, record]);

  const tirarFoto = async (campo) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      setUploading(campo);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setData((d) => ({ ...d, [campo]: [...(d[campo] || []), file_url] }));
      setUploading(null);
    };
    input.click();
  };

  const remFoto = (campo, idx) => setData({ ...data, [campo]: data[campo].filter((_, i) => i !== idx) });

  const salvar = async () => {
    if (!data.titulo) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.OrdemServico.update(id, rest); }
    else await base44.entities.OrdemServico.create(data);
    onSaved?.(); onClose?.();
  };

  const concluir = async () => {
    await concluirOS({
      os: record,
      custo_real: parseFloat(conclusao.custo_real) || 0,
      laudo: conclusao.laudo,
      fotos_depois: data.fotos_depois,
      conta_pagar: conclusao.conta_pagar,
    });
    onSaved?.(); onClose?.();
  };

  const equipNome = (id) => equipamentos.find((e) => e.id === id)?.nome || "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? `OS — ${record.titulo}` : "Nova ordem de serviço"}
            {isEdit && <StatusBadge status={data.status} kind="os" />}
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
                <SelectItem value="corretiva">Corretiva</SelectItem>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="instalacao">Instalação</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={data.prioridade} onValueChange={(v) => setData({ ...data, prioridade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
          <Field label="Equipamento">
            <Select value={data.equipamento_id || "__none__"} onValueChange={(v) => setData({ ...data, equipamento_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Responsável interno">
            <Select value={data.responsavel_id || "__none__"} onValueChange={(v) => setData({ ...data, responsavel_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fornecedor (prestador)">
            <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => setData({ ...data, fornecedor_id: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome_fantasia}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Abertura"><Input type="date" value={data.data_abertura || ""} onChange={(e) => setData({ ...data, data_abertura: e.target.value })} /></Field>
          <Field label="Previsão"><Input type="date" value={data.data_prevista || ""} onChange={(e) => setData({ ...data, data_prevista: e.target.value })} /></Field>
          <Field label="Custo previsto (R$)"><Input type="number" step="0.01" value={data.custo_previsto || ""} onChange={(e) => setData({ ...data, custo_previsto: parseFloat(e.target.value) || 0 })} /></Field>
          {isEdit && (
            <Field label="Status">
              <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="em_execucao">Em execução</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={3} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} />
          </Field>

          {/* Fotos antes */}
          <div className="col-span-2">
            <div className="text-xs font-medium mb-1">Fotos antes</div>
            <Button type="button" variant="outline" size="sm" onClick={() => tirarFoto("fotos_antes")} disabled={uploading === "fotos_antes"}>
              <Camera className="w-3.5 h-3.5 mr-1" /> {uploading === "fotos_antes" ? "..." : "Adicionar"}
            </Button>
            {(data.fotos_antes || []).length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {data.fotos_antes.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} alt="" className="w-full h-20 object-cover rounded border border-border" />
                    <button onClick={() => remFoto("fotos_antes", i)} className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fotos depois */}
          {isEdit && (
            <div className="col-span-2">
              <div className="text-xs font-medium mb-1">Fotos depois</div>
              <Button type="button" variant="outline" size="sm" onClick={() => tirarFoto("fotos_depois")} disabled={uploading === "fotos_depois"}>
                <Camera className="w-3.5 h-3.5 mr-1" /> {uploading === "fotos_depois" ? "..." : "Adicionar"}
              </Button>
              {(data.fotos_depois || []).length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {data.fotos_depois.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={f} alt="" className="w-full h-20 object-cover rounded border border-border" />
                      <button onClick={() => remFoto("fotos_depois", i)} className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isEdit && record?.id && <div className="mt-4"><ComentariosTimeline entidade="OrdemServico" entidade_id={record.id} /></div>}

        {conclusao.open && (
          <div className="border-t border-border pt-3 mt-3 space-y-2 bg-emerald-50/40 rounded p-3">
            <div className="text-xs font-medium">Concluir OS {record?.equipamento_id && ` — ${equipNome(record.equipamento_id)}`}</div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="0.01" placeholder="Custo real" value={conclusao.custo_real}
                onChange={(e) => setConclusao({ ...conclusao, custo_real: e.target.value })} />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={conclusao.conta_pagar}
                  onChange={(e) => setConclusao({ ...conclusao, conta_pagar: e.target.checked })} />
                Gerar conta a pagar (custo futuro)
              </label>
            </div>
            <Textarea rows={2} placeholder="Laudo / observações técnicas" value={conclusao.laudo}
              onChange={(e) => setConclusao({ ...conclusao, laudo: e.target.value })} />
            <Button size="sm" onClick={concluir} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar conclusão
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {isEdit && data.status !== "concluida" && data.status !== "cancelada" && (
            <Button variant="outline" size="sm" onClick={() => setConclusao({ ...conclusao, open: !conclusao.open })}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluir OS
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={salvar} disabled={!data.titulo}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}