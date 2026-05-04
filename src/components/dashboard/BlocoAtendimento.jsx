import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoAtendimento({ at }) {
  return (
    <Bloco titulo="Atendimento e experiência" icone={MessageCircle} verMais="/admin/atendimento">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        <StatCard label="Reclamações abertas" value={at.abertasCount} tone={at.abertasCount > 0 ? "alerta" : "default"} />
        <StatCard label="Avaliações no período" value={at.avaliacoesCount} vazio={at.avaliacoesCount === 0} mensagemVazio="Sem avaliações" />
        <StatCard label="NPS médio" value={at.nps > 0 ? at.nps.toFixed(1) : "—"} hint="0 a 10" />
        <StatCard label="Cortesias" value={at.cortesias} />
        <StatCard label="Reembolsos" value={at.reembolsos} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Reclamações pendentes</div>
          {at.abertas.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma reclamação em aberto.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {at.abertas.map((r) => <li key={r.id} className="truncate">{r.titulo}</li>)}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Principais motivos</div>
          {at.principaisMotivos.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Sem motivos registrados.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {at.principaisMotivos.map((m) => (
                <li key={m.motivo} className="flex justify-between gap-2">
                  <span className="truncate">{m.motivo.replace(/_/g, " ")}</span>
                  <span className="font-mono shrink-0">{m.qtd}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Bloco>
  );
}