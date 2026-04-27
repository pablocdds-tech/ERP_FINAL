import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { MOTIVOS_RECLAMACAO, STATUS_TRATATIVA, TIPOS_SOLUCAO, CANAIS_ORIGEM } from "@/lib/atendimento-config";

export default function ReclamacaoDialog({ open, onOpenChange, item, onSaved, clientes = [] }) {
  const [data, setData] = useState({});

  useEffect(() => {
    setData(item || {
      data: new Date().toISOString().slice(0, 10),
      canal_origem: "whatsapp",
      motivo: "outro",
      severidade: "media",
      tipo_solucao: "nenhuma",
      status_tratativa: "aberta",
    });
  }, [item, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.titulo) return;
    if (item?.id) await base44.entities.Reclamacao.update(item.id, data);
    else await base44.entities.Reclamacao.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar reclamação" : "Nova reclamação"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" required className="col-span-2">
            <Input value={data.titulo || ""} onChange={(e) => set("titulo", e.target.value)} placeholder="Resumo do problema" />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={3} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} />
          </Field>

          <Field label="Loja" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} />
          </Field>
          <Field label="Data">
            <Input type="date" value={data.data || ""} onChange={(e) => set("data", e.target.value)} />
          </Field>

          <Field label="Cliente cadastrado">
            <Select value={data.cliente_id || "_none"} onValueChange={(v) => set("cliente_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="(livre)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(não cadastrado)</SelectItem>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome do cliente (livre)">
            <Input value={data.cliente_nome || ""} onChange={(e) => set("cliente_nome", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={data.cliente_telefone || ""} onChange={(e) => set("cliente_telefone", e.target.value)} />
          </Field>
          <Field label="Canal de origem">
            <Select value={data.canal_origem} onValueChange={(v) => set("canal_origem", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CANAIS_ORIGEM.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Motivo">
            <Select value={data.motivo} onValueChange={(v) => set("motivo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_RECLAMACAO.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Severidade">
            <Select value={data.severidade} onValueChange={(v) => set("severidade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Pedido (referência)">
            <Input value={data.pedido_referencia || ""} onChange={(e) => set("pedido_referencia", e.target.value)} placeholder="Ex: #12345" />
          </Field>
          <Field label="Valor do pedido (R$)">
            <Input type="number" step="0.01" value={data.valor_pedido || ""} onChange={(e) => set("valor_pedido", parseFloat(e.target.value) || 0)} />
          </Field>

          <Field label="Status da tratativa">
            <Select value={data.status_tratativa} onValueChange={(v) => set("status_tratativa", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_TRATATIVA.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Responsável pela tratativa">
            <Input value={data.responsavel_tratativa || ""} onChange={(e) => set("responsavel_tratativa", e.target.value)} placeholder="email ou nome" />
          </Field>

          <Field label="Tipo de solução">
            <Select value={data.tipo_solucao} onValueChange={(v) => set("tipo_solucao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_SOLUCAO.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Valor de compensação (R$)">
            <Input type="number" step="0.01" value={data.valor_compensacao || ""} onChange={(e) => set("valor_compensacao", parseFloat(e.target.value) || 0)} />
          </Field>

          <Field label="Solução aplicada" className="col-span-2">
            <Textarea rows={2} value={data.solucao || ""} onChange={(e) => set("solucao", e.target.value)} />
          </Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}