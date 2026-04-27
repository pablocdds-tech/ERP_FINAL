import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";

export default function IntegracaoDialog({ open, onOpenChange, integracao, onSaved }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm(integracao || { tipo: "n8n", ativo: true, ultimo_status: "nunca", eventos_assinados: [] });
  }, [integracao, open]);

  const salvar = async () => {
    const data = {
      ...form,
      eventos_assinados: typeof form.eventos_assinados === "string"
        ? form.eventos_assinados.split(",").map((s) => s.trim()).filter(Boolean)
        : (form.eventos_assinados || []),
    };
    if (form.id) await base44.entities.Integracao.update(form.id, data);
    else await base44.entities.Integracao.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? "Editar integração" : "Nova integração"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nome" required>
            <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Tipo" required>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="n8n">n8n</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="webhook_generico">Webhook genérico</SelectItem>
                <SelectItem value="agent_externo">Agent externo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL do webhook (envio)">
            <Input value={form.url_webhook || ""} onChange={(e) => setForm({ ...form, url_webhook: e.target.value })} placeholder="https://n8n.exemplo.com/webhook/..." />
          </Field>
          <Field label="Token de segurança" hint="Compartilhado com o destino para validar a chamada.">
            <Input value={form.token_seguranca || ""} onChange={(e) => setForm({ ...form, token_seguranca: e.target.value })} />
          </Field>
          <Field label="Eventos assinados" hint="Separe por vírgula. Ex: pedido.criado, fechamento.aprovado">
            <Input
              value={Array.isArray(form.eventos_assinados) ? form.eventos_assinados.join(", ") : (form.eventos_assinados || "")}
              onChange={(e) => setForm({ ...form, eventos_assinados: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <Textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={!form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}