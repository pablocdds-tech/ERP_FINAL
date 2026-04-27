import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function SecaoSangrias({ sangrias, onChange, disabled }) {
  const add = () => onChange([...sangrias, { valor: 0, motivo: "", responsavel: "", horario: "" }]);
  const update = (idx, patch) => onChange(sangrias.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const remove = (idx) => onChange(sangrias.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {sangrias.length === 0 && (
        <Card className="p-4 text-center text-sm text-muted-foreground">Sem sangrias registradas</Card>
      )}
      {sangrias.map((s, idx) => (
        <Card key={idx} className="p-3">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6 md:col-span-4">
              <div className="text-[11px] text-muted-foreground mb-1">Motivo</div>
              <Input value={s.motivo || ""} onChange={(e) => update(idx, { motivo: e.target.value })} disabled={disabled} />
            </div>
            <div className="col-span-6 md:col-span-3">
              <div className="text-[11px] text-muted-foreground mb-1">Responsável</div>
              <Input value={s.responsavel || ""} onChange={(e) => update(idx, { responsavel: e.target.value })} disabled={disabled} />
            </div>
            <div className="col-span-4 md:col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Hora</div>
              <Input type="time" value={s.horario || ""} onChange={(e) => update(idx, { horario: e.target.value })} disabled={disabled} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Valor (R$)</div>
              <Input type="number" step="0.01" className="text-right" value={s.valor ?? ""} onChange={(e) => update(idx, { valor: parseFloat(e.target.value) || 0 })} disabled={disabled} />
            </div>
            <div className="col-span-2 md:col-span-1 flex justify-end">
              {!disabled && (
                <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1.5" /> Adicionar sangria
        </Button>
      )}
    </div>
  );
}