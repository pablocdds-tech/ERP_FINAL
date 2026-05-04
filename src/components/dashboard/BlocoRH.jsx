import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoRH({ rh }) {
  return (
    <Bloco titulo="Pessoas e RH" icone={Users} verMais="/admin/pessoas">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        <StatCard label="Presentes agora" value={rh.presentes} hint={`de ${rh.total} ativos`} tone="positivo" />
        <StatCard label="Sem bater ponto" value={rh.semBaterCount} tone={rh.semBaterCount > 0 ? "alerta" : "default"} />
        <StatCard label="Pontos pendentes" value={rh.pendRevisao} tone={rh.pendRevisao > 0 ? "alerta" : "default"} />
        <StatCard label="Baixa confiança" value={rh.baixaConfianca.length} tone={rh.baixaConfianca.length > 0 ? "alerta" : "default"} hint="Reconhecimento facial" />
        <StatCard label="Solicitações pend." value={rh.solicPend} />
        <StatCard label="Escalas vazias" value={rh.escalasVazias} tone={rh.escalasVazias > 0 ? "alerta" : "default"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Sem bater ponto</div>
          {rh.semBaterLista.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Todos os colaboradores ativos baterão ponto hoje.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {rh.semBaterLista.map((c) => <li key={c.id} className="truncate">{c.nome}</li>)}
            </ul>
          )}
        </Card>
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
      </div>
    </Bloco>
  );
}