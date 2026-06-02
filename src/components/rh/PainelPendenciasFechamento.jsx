import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Mostra as pendências impeditivas do fechamento.
 * Quando há bloqueios, o botão Fechar deve ficar desabilitado (controlado pelo pai).
 */
export default function PainelPendenciasFechamento({ pendencias, loading }) {
  if (loading) {
    return (
      <Card className="p-4 mb-4 text-sm text-muted-foreground">Verificando pendências...</Card>
    );
  }
  if (!pendencias) return null;

  if (pendencias.bloqueios.length === 0) {
    return (
      <Card className="p-4 mb-4 flex items-center gap-2 border-emerald-200 bg-emerald-50/50">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span className="text-sm text-emerald-800">Nenhuma pendência impeditiva. Período pronto para fechamento.</span>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-4 border-amber-300 bg-amber-50/40">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-900">
          {pendencias.bloqueios.length} colaborador(es) com pendências — resolva antes de fechar
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-auto">
        {pendencias.bloqueios.map((b) => (
          <div key={b.colaborador_id} className="text-sm border-b border-amber-200/60 pb-2 last:border-0">
            <div className="font-medium">{b.nome}</div>
            <ul className="mt-1 ml-1 space-y-0.5">
              {b.itens.map((it, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                  <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  {it.label}
                  {it.dias?.length ? <span className="text-amber-600"> ({it.dias.map((d) => d.slice(8, 10) + "/" + d.slice(5, 7)).join(", ")})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}