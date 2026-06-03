import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { otimizarSequencia, fmtMoeda, ORIGENS } from "@/lib/delivery-service";

export default function CriarRotaDialog({ open, onOpenChange, pedidos, drivers, origem, settings, onConfirm, saving }) {
  const [ordenados, setOrdenados] = useState([]);
  const [motoboyId, setMotoboyId] = useState("");

  useEffect(() => {
    if (open) {
      setOrdenados(otimizarSequencia(origem, pedidos));
      setMotoboyId("");
    }
  }, [open, pedidos, origem]);

  const mover = (idx, dir) => {
    const novo = [...ordenados];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setOrdenados(novo);
  };

  const otimizar = () => setOrdenados(otimizarSequencia(origem, ordenados));

  const total = ordenados.reduce((s, p) => s + Number(p.total || 0), 0);
  const motoboy = drivers.find((d) => d.id === motoboyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar rota · {ordenados.length} pedido(s)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2">
            <Select value={motoboyId} onValueChange={setMotoboyId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar motoboy" />
              </SelectTrigger>
              <SelectContent>
                {drivers.length === 0 && <SelectItem value="none" disabled>Nenhum motoboy cadastrado</SelectItem>}
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name} {d.plate ? `· ${d.plate}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={otimizar}>Otimizar</Button>
          </div>

          <div className="space-y-1.5">
            {ordenados.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">#{p.numero_pedido} — {p.cliente_nome}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin className="w-3 h-3 shrink-0" />{p.bairro || "—"}
                    {(p.latitude == null) && <span className="text-amber-600">· sem coord</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{ORIGENS[p.origem] || p.origem}</Badge>
                <div className="flex flex-col">
                  <button onClick={() => mover(idx, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => mover(idx, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-sm text-muted-foreground mr-auto">Total: <b>{fmtMoeda(total)}</b></div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={() => onConfirm({ pedidos: ordenados, motoboy })}>
            {saving ? "Criando..." : "Criar rota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}