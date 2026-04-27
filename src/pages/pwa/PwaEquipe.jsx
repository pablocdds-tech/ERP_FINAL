import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePwa } from "@/lib/PwaContext";
import { calcularMinutosTrabalhados, formatMinutos, diagnosticoDia, labelPonto } from "@/lib/rh-service";
import { format } from "date-fns";

export default function PwaEquipe() {
  const { gestor, colaborador } = usePwa() || {};
  const [colaboradores, setColaboradores] = useState([]);
  const [registrosHoje, setRegistrosHoje] = useState([]);
  const [escalasHoje, setEscalasHoje] = useState([]);

  useEffect(() => {
    if (!gestor) return;
    const hoje = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.Colaborador.filter({ status: "ativo" }, "nome", 200),
      base44.entities.RegistroPonto.filter({ data: hoje }),
      base44.entities.Escala.filter({ data: hoje }),
    ]).then(([c, r, e]) => {
      const filtered = colaborador?.loja_id ? c.filter((x) => x.loja_id === colaborador.loja_id) : c;
      setColaboradores(filtered); setRegistrosHoje(r); setEscalasHoje(e);
    });
  }, [gestor, colaborador?.loja_id]);

  if (!gestor) return <div className="text-center py-10 text-sm text-muted-foreground">Acesso restrito.</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Equipe hoje</h1>
      <p className="text-xs text-muted-foreground mb-4">{format(new Date(), "dd/MM/yyyy")}</p>

      <div className="space-y-2">
        {colaboradores.map((c) => {
          const regs = registrosHoje.filter((r) => r.colaborador_id === c.id);
          const esc = escalasHoje.find((e) => e.colaborador_id === c.id);
          const min = calcularMinutosTrabalhados(regs);
          const diag = diagnosticoDia(esc, regs);
          const ultimoTipo = regs[regs.length - 1]?.tipo;
          return (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {esc?.tipo === "normal" ? `${esc.hora_entrada}–${esc.hora_saida}` : (esc?.tipo || "sem escala")}
                    {ultimoTipo && ` · último: ${labelPonto(ultimoTipo)}`}
                  </div>
                </div>
                <div className="text-right">
                  <DiagBadge diag={diag} />
                  <div className="text-xs font-mono mt-1">{formatMinutos(min)}</div>
                </div>
              </div>
            </Card>
          );
        })}
        {colaboradores.length === 0 && <Card className="p-5 text-center text-sm text-muted-foreground">Sem colaboradores ativos.</Card>}
      </div>
    </div>
  );
}

function DiagBadge({ diag }) {
  const map = {
    ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    atraso: { label: "Atraso", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    falta: { label: "Falta", cls: "bg-red-50 text-red-700 border-red-200" },
    sem_jornada: { label: "—", cls: "" },
  };
  const c = map[diag.status] || map.sem_jornada;
  return <Badge variant="outline" className={`font-normal text-[10px] ${c.cls}`}>{c.label}</Badge>;
}