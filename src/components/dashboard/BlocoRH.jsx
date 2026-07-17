import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoRH({ rh }) {
  return (
    <Bloco titulo="Pessoas e RH" icone={Users} verMais="/admin/pessoas">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <StatCard label="Colaboradores ativos" value={rh.total} tone="positivo" />
        <StatCard label="Solicitações pend." value={rh.solicPend} tone={rh.solicPend > 0 ? "alerta" : "default"} />
        <StatCard label="Escalas vazias" value={rh.escalasVazias} tone={rh.escalasVazias > 0 ? "alerta" : "default"} />
      </div>
      <Card className="p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Solicitações pendentes</div>
        {rh.solicLista.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-3">Nenhuma solicitação pendente.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {rh.solicLista.map((s) => <li key={s.id} className="truncate">{s.tipo || "—"}: {s.descricao || s.colaborador_nome || "—"}</li>)}
          </ul>
        )}
      </Card>
    </Bloco>
  );
}