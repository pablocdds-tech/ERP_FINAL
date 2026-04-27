import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Field from "@/components/cadastros/Field";

export default function ClienteDialog({ open, onOpenChange, item, onSaved }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { aceita_marketing: true, status: "ativo" });
  }, [item, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.nome) return;
    if (item?.id) await base44.entities.Cliente.update(item.id, data);
    else await base44.entities.Cliente.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" required className="col-span-2">
            <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={data.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="CPF/CNPJ">
            <Input value={data.documento || ""} onChange={(e) => set("documento", e.target.value)} />
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={data.data_nascimento || ""} onChange={(e) => set("data_nascimento", e.target.value)} />
          </Field>
          <Field label="Endereço" className="col-span-2">
            <Input value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} />
          </Field>
          <Field label="Tags (separadas por vírgula)" className="col-span-2">
            <Input value={(data.tags || []).join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="Aceita marketing" className="col-span-2">
            <Switch checked={data.aceita_marketing !== false} onCheckedChange={(v) => set("aceita_marketing", v)} />
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