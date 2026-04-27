import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";

export default function AvaliacaoDialog({ open, onOpenChange, item, onSaved }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || {
      data: new Date().toISOString().slice(0, 10),
      canal_origem: "ifood",
      tipo: "estrela",
      respondida: false,
    });
  }, [item, open]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (item?.id) await base44.entities.Avaliacao.update(item.id, data);
    else await base44.entities.Avaliacao.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar avaliação" : "Nova avaliação"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} /></Field>
          <Field label="Data"><Input type="date" value={data.data || ""} onChange={(e) => set("data", e.target.value)} /></Field>
          <Field label="Cliente"><Input value={data.cliente_nome || ""} onChange={(e) => set("cliente_nome", e.target.value)} /></Field>
          <Field label="Canal">
            <Select value={data.canal_origem} onValueChange={(v) => set("canal_origem", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ifood">iFood</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estrela">Estrelas (1-5)</SelectItem>
                <SelectItem value="nps">NPS (0-10)</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {(data.tipo === "estrela" || data.tipo === "ambos") && (
            <Field label="Nota (1-5)">
              <Input type="number" min="1" max="5" value={data.nota || ""} onChange={(e) => set("nota", parseInt(e.target.value) || 0)} />
            </Field>
          )}
          {(data.tipo === "nps" || data.tipo === "ambos") && (
            <Field label="NPS (0-10)">
              <Input type="number" min="0" max="10" value={data.nps_score ?? ""} onChange={(e) => set("nps_score", parseInt(e.target.value) || 0)} />
            </Field>
          )}
          <Field label="Comentário" className="col-span-2">
            <Textarea rows={3} value={data.comentario || ""} onChange={(e) => set("comentario", e.target.value)} />
          </Field>
          <Field label="Resposta enviada" className="col-span-2">
            <Textarea rows={2} value={data.resposta || ""} onChange={(e) => set("resposta", e.target.value)} />
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