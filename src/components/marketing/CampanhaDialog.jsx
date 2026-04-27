import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";

const TIPOS = ["desconto", "combo", "fidelidade", "recuperacao", "lancamento", "sazonal", "outro"];
const PUBLICOS = ["todos", "novos", "recorrentes", "inativos", "vip"];
const STATUS = ["rascunho", "agendada", "ativa", "encerrada", "cancelada"];

export default function CampanhaDialog({ open, onOpenChange, item, onSaved }) {
  const [data, setData] = useState({});
  useEffect(() => {
    setData(item || { tipo: "desconto", publico_alvo: "todos", status: "rascunho" });
  }, [item, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.nome) return;
    if (item?.id) await base44.entities.Campanha.update(item.id, data);
    else await base44.entities.Campanha.create(data);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.id ? "Editar campanha" : "Nova campanha"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" required className="col-span-2">
            <Input value={data.nome || ""} onChange={(e) => set("nome", e.target.value)} />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Textarea rows={2} value={data.descricao || ""} onChange={(e) => set("descricao", e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Público-alvo">
            <Select value={data.publico_alvo} onValueChange={(v) => set("publico_alvo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PUBLICOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Início">
            <Input type="date" value={data.data_inicio || ""} onChange={(e) => set("data_inicio", e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="date" value={data.data_fim || ""} onChange={(e) => set("data_fim", e.target.value)} />
          </Field>
          <Field label="Investimento (R$)">
            <Input type="number" step="0.01" value={data.investimento || ""} onChange={(e) => set("investimento", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Meta de receita (R$)">
            <Input type="number" step="0.01" value={data.meta_receita || ""} onChange={(e) => set("meta_receita", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Meta de pedidos">
            <Input type="number" value={data.meta_pedidos || ""} onChange={(e) => set("meta_pedidos", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Status">
            <Select value={data.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
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