import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FORMS } from "./forms";

export default function CadastroDialog({ open, mode, config, record, onClose, onSaved }) {
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const FormComp = FORMS[config?.formComponent];

  useEffect(() => {
    if (open) setData(record || { ativo: true });
  }, [open, record]);

  if (!config) return null;
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";
  const title = isCreate
    ? `Novo ${config.singular}`
    : isEdit
    ? `Editar ${config.singular}`
    : config.singular;

  const handleSave = async () => {
    setSaving(true);
    const Entity = (await import("@/api/base44Client")).base44.entities[config.entity];
    if (isCreate) {
      await Entity.create(data);
    } else {
      const { id, ...rest } = data;
      await Entity.update(id, rest);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {FormComp && <FormComp data={data} onChange={setData} readOnly={isView} />}

        {!isView && !config.readOnly && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Switch
              checked={data.ativo !== false}
              onCheckedChange={(v) => setData({ ...data, ativo: v })}
              id="ativo-switch"
            />
            <Label htmlFor="ativo-switch" className="text-sm cursor-pointer">
              {data.ativo !== false ? "Ativo" : "Inativo"}
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isView ? "Fechar" : "Cancelar"}
          </Button>
          {!isView && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}