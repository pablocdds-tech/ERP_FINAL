import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";

const empty = () => ({
  colaborador_id: "", loja_id: "", data: new Date().toISOString().slice(0, 10),
  hora_entrada: "08:00", hora_saida: "17:00", intervalo_minutos: 60, tipo: "normal",
});

export default function EscalaDialog({ open, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [colaboradores, setColaboradores] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      base44.entities.Colaborador.filter({ status: "ativo" }).then(setColaboradores);
    }
  }, [open, record]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const salvar = async () => {
    if (!data.colaborador_id || !data.data) return;
    setSaving(true);
    const col = colaboradores.find((c) => c.id === data.colaborador_id);
    const payload = { ...data, loja_id: data.loja_id || col?.loja_id };
    if (record?.id) {
      const { id, ...rest } = payload;
      await base44.entities.Escala.update(id, rest);
    } else {
      await base44.entities.Escala.create(payload);
    }
    setSaving(false); onSaved?.(); onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{record ? "Editar escala" : "Nova escala"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Colaborador" required>
            <Select value={data.colaborador_id} onValueChange={(v) => set("colaborador_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data} onChange={(e) => set("data", e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={data.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="folga">Folga</SelectItem>
                <SelectItem value="feriado">Feriado</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastamento">Afastamento</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {data.tipo === "normal" && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Entrada"><Input type="time" value={data.hora_entrada} onChange={(e) => set("hora_entrada", e.target.value)} /></Field>
              <Field label="Saída"><Input type="time" value={data.hora_saida} onChange={(e) => set("hora_saida", e.target.value)} /></Field>
              <Field label="Intervalo (min)"><Input type="number" value={data.intervalo_minutos ?? ""} onChange={(e) => set("intervalo_minutos", parseInt(e.target.value) || 0)} /></Field>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !data.colaborador_id}>{saving ? "..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}