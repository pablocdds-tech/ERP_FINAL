import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO = { normal: "Trabalho", folga: "Folga", feriado: "Feriado", ferias: "Férias", afastamento: "Afastamento" };
const TIPO_CLS = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  folga: "bg-blue-50 text-blue-700 border-blue-200",
  feriado: "bg-amber-50 text-amber-700 border-amber-200",
  ferias: "bg-violet-50 text-violet-700 border-violet-200",
  afastamento: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PwaEscala() {
  const { colaborador } = usePwa() || {};
  const [escalas, setEscalas] = useState([]);

  useEffect(() => {
    if (!colaborador?.id) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const futuro = addDays(new Date(), 30).toISOString().slice(0, 10);
    base44.entities.Escala
      .filter({ colaborador_id: colaborador.id }, "data", 100)
      .then((all) => setEscalas(all.filter((e) => e.data >= hoje && e.data <= futuro)));
  }, [colaborador?.id]);

  if (!colaborador) {
    return (<div><PageTitle title="Escala" /><Card className="p-5 text-sm text-muted-foreground">Sem vínculo de colaborador.</Card></div>);
  }

  return (
    <div>
      <PageTitle title="Minha escala" subtitle="Próximos 30 dias" />
      {escalas.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Nenhuma escala programada.</Card>
      ) : (
        <div className="space-y-2">
          {escalas.map((e) => (
            <Card key={e.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground capitalize">
                  {format(new Date(e.data), "EEEE", { locale: ptBR })}
                </div>
                <div className="text-sm font-medium">{format(new Date(e.data), "dd/MM/yyyy")}</div>
              </div>
              <div className="text-right">
                <span className={`text-[11px] px-2 py-0.5 rounded border ${TIPO_CLS[e.tipo]}`}>{TIPO[e.tipo]}</span>
                {e.tipo === "normal" && (
                  <div className="text-xs font-mono mt-1">{e.hora_entrada}–{e.hora_saida}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}