import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bike, Package, Clock } from "lucide-react";
import { getRouteStatus, fmtMoeda } from "@/lib/delivery-service";

export default function RotaListItem({ rota, onAbrir }) {
  const st = getRouteStatus(rota.status);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">{rota.route_number}</span>
        <Badge className={`text-[10px] ${st.cor}`} variant="outline">{st.label}</Badge>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Bike className="w-3 h-3" /> {rota.motoboy_name || "Sem motoboy"}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {rota.total_orders}</span>
        <span>{fmtMoeda(rota.total_amount)}</span>
        {rota.estimated_distance_km > 0 && <span>{rota.estimated_distance_km}km</span>}
        {rota.estimated_duration_minutes > 0 && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rota.estimated_duration_minutes}min</span>
        )}
      </div>
      <Button size="sm" variant="outline" className="w-full mt-2 h-8" onClick={() => onAbrir(rota)}>
        Abrir detalhes
      </Button>
    </div>
  );
}