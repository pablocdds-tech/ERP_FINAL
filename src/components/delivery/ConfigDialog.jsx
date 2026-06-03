import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { geocodificar } from "@/lib/delivery-service";

export default function ConfigDialog({ open, onOpenChange, settings, lojaId, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings || {
      base_address: "", base_latitude: null, base_longitude: null,
      avg_minutes_per_delivery: 12, max_radius_km: 8, max_orders_per_route: 8,
      auto_group_by_neighborhood: true, auto_geocode: true, map_provider: "osm",
    });
  }, [settings, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buscarCoord = async () => {
    const c = await geocodificar(form.base_address);
    if (c) setForm((f) => ({ ...f, base_latitude: c.lat, base_longitude: c.lng }));
  };

  const salvar = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Configurações da roteirização</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Endereço base da loja</Label>
            <div className="flex gap-2">
              <Input value={form.base_address || ""} onChange={(e) => set("base_address", e.target.value)} />
              <Button variant="outline" onClick={buscarCoord}>Geocodificar</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude</Label><Input value={form.base_latitude ?? ""} onChange={(e) => set("base_latitude", parseFloat(e.target.value) || null)} /></div>
            <div><Label>Longitude</Label><Input value={form.base_longitude ?? ""} onChange={(e) => set("base_longitude", parseFloat(e.target.value) || null)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Min/entrega</Label><Input type="number" value={form.avg_minutes_per_delivery ?? 12} onChange={(e) => set("avg_minutes_per_delivery", Number(e.target.value))} /></div>
            <div><Label>Raio máx (km)</Label><Input type="number" value={form.max_radius_km ?? 8} onChange={(e) => set("max_radius_km", Number(e.target.value))} /></div>
          </div>
          <div><Label>Máx pedidos por rota</Label><Input type="number" value={form.max_orders_per_route ?? 8} onChange={(e) => set("max_orders_per_route", Number(e.target.value))} /></div>
          <div className="flex items-center justify-between">
            <Label>Agrupar por bairro automaticamente</Label>
            <Switch checked={!!form.auto_group_by_neighborhood} onCheckedChange={(v) => set("auto_group_by_neighborhood", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Geocodificação automática</Label>
            <Switch checked={!!form.auto_geocode} onCheckedChange={(v) => set("auto_geocode", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}