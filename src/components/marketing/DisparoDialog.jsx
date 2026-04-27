import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";

const PUBLICOS = ["todos", "ativos", "inativos", "recorrentes", "vip", "lista_custom"];

export default function DisparoDialog({ open, onOpenChange, item, onSaved, campanhas = [] }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { canal: "whatsapp", publico_alvo: "ativos", status: "rascunho" });
  }, [item, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.titulo) return;
    if (item?.id) await base44.entities.DisparoMarketing.update(item.id, data);
    else await base44.entities.DisparoMarketing.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar disparo" : "Novo disparo"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" required className="col-span-2">
            <Input value={data.titulo || ""} onChange={(e) => set("titulo", e.target.value)} />
          </Field>
          <Field label="Canal">
            <Select value={data.canal} onValueChange={(v) => set("canal", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="n8n">n8n (genérico)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Público-alvo">
            <Select value={data.publico_alvo} onValueChange={(v) => set("publico_alvo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PUBLICOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Campanha vinculada" className="col-span-2">
            <Select value={data.campanha_id || "_none"} onValueChange={(v) => set("campanha_id", v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="(nenhuma)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(nenhuma)</SelectItem>
                {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mensagem" className="col-span-2" hint="Use {nome} para personalizar">
            <Textarea rows={4} value={data.mensagem || ""} onChange={(e) => set("mensagem", e.target.value)} />
          </Field>
          <Field label="Agendar para">
            <Input type="datetime-local" value={data.agendado_para || ""} onChange={(e) => set("agendado_para", e.target.value)} />
          </Field>
          <Field label="Webhook n8n (opcional)">
            <Input value={data.webhook_n8n || ""} onChange={(e) => set("webhook_n8n", e.target.value)} placeholder="https://..." />
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