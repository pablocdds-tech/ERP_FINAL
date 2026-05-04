import { Card } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoRotinas({ rt }) {
  return (
    <Bloco titulo="Rotinas operacionais" icone={CheckSquare} verMais="/admin/rotinas">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        <StatCard label="Checklists concluídos" value={rt.concluidos} tone="positivo" />
        <StatCard label="Checklists pendentes" value={rt.pendentes} tone={rt.pendentes > 0 ? "alerta" : "default"} />
        <StatCard label="Chamados abertos" value={rt.abertos} />
        <StatCard label="Chamados críticos" value={rt.criticos} tone={rt.criticos > 0 ? "negativo" : "default"} />
        <StatCard label="Manutenções pend." value={rt.manutPend} />
        <StatCard label="Tarefas atrasadas" value={rt.atrasadas} tone={rt.atrasadas > 0 ? "alerta" : "default"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Chamados críticos</div>
          {rt.listaCriticos.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhum chamado crítico aberto.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {rt.listaCriticos.map((c) => <li key={c.id} className="truncate">{c.titulo}</li>)}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Tarefas atrasadas</div>
          {rt.listaAtrasadas.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma tarefa atrasada.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {rt.listaAtrasadas.map((t) => <li key={t.id} className="truncate">{t.titulo}</li>)}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Últimas ocorrências</div>
          {rt.ultimasOcorrencias.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma ocorrência recente.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {rt.ultimasOcorrencias.map((o) => <li key={o.id} className="truncate">{o.titulo || o.descricao}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </Bloco>
  );
}