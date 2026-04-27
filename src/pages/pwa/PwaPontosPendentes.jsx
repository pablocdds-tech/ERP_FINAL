import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, AlertCircle } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { labelPonto } from "@/lib/rh-service";
import { aprovarRegistroPontoManual, rejeitarRegistroPontoManual } from "@/lib/ponto-service";
import { format } from "date-fns";

export default function PwaPontosPendentes() {
  const { gestor } = usePwa() || {};
  const [pendentes, setPendentes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [acao, setAcao] = useState(null); // {tipo, registro, motivo}

  const load = async () => {
    const list = await base44.entities.RegistroPonto.filter(
      { status: "pendente_revisao" }, "-horario", 100
    );
    setPendentes(list);
    const ids = [...new Set(list.map((r) => r.colaborador_id))];
    if (ids.length) {
      const cols = await base44.entities.Colaborador.list("nome", 500);
      setColaboradores(cols);
    }
  };
  useEffect(() => { load(); }, []);

  if (!gestor) {
    return (
      <div>
        <PageTitle title="Pontos pendentes" />
        <Card className="p-5 text-sm text-muted-foreground">Apenas gestores acessam esta área.</Card>
      </div>
    );
  }

  const colaboradorPor = (id) => colaboradores.find((c) => c.id === id);

  const executar = async () => {
    if (!acao) return;
    const { tipo, registro, motivo } = acao;
    if (tipo === "aprovar") await aprovarRegistroPontoManual(registro, motivo);
    else await rejeitarRegistroPontoManual(registro, motivo || "Sem motivo");
    setAcao(null);
    load();
  };

  return (
    <div>
      <PageTitle title="Pontos pendentes" subtitle={`${pendentes.length} em revisão`} />

      {pendentes.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Sem pendências.</Card>
      ) : (
        <div className="space-y-2">
          {pendentes.map((r) => {
            const col = colaboradorPor(r.colaborador_id);
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-start gap-3">
                  {r.selfie_url ? (
                    <img src={r.selfie_url} alt="selfie" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{col?.nome || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {labelPonto(r.tipo)} · {format(new Date(r.horario), "dd/MM HH:mm")}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">{r.origem}</Badge>
                      {r.fallback_pin && <Badge variant="secondary" className="text-[10px]">PIN</Badge>}
                      {r.ia_resultado && r.ia_resultado !== "nao_avaliado" && (
                        <Badge variant="outline" className="text-[10px]">
                          IA: {r.ia_resultado}{r.ia_confianca != null ? ` ${Math.round(r.ia_confianca * 100)}%` : ""}
                        </Badge>
                      )}
                    </div>
                    {r.ia_motivo && (
                      <div className="flex items-start gap-1 mt-1 text-[11px] text-amber-700">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{r.ia_motivo}
                      </div>
                    )}
                  </div>
                </div>
                {col?.facial_frontal_url && r.selfie_url && (
                  <div className="mt-2 flex gap-2">
                    <div className="text-[10px] text-muted-foreground">Referência:</div>
                    <img src={col.facial_frontal_url} alt="ref" className="w-12 h-12 rounded object-cover border border-border" />
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => setAcao({ tipo: "rejeitar", registro: r, motivo: "" })}>
                    <X className="w-3.5 h-3.5 mr-1" />Rejeitar
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setAcao({ tipo: "aprovar", registro: r, motivo: "" })}>
                    <Check className="w-3.5 h-3.5 mr-1" />Aprovar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!acao} onOpenChange={(o) => !o && setAcao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{acao?.tipo === "aprovar" ? "Aprovar ponto" : "Rejeitar ponto"}</DialogTitle></DialogHeader>
          <Textarea
            rows={3}
            placeholder={acao?.tipo === "rejeitar" ? "Motivo (obrigatório)" : "Observação (opcional)"}
            value={acao?.motivo || ""}
            onChange={(e) => setAcao({ ...acao, motivo: e.target.value })}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
            <Button onClick={executar} disabled={acao?.tipo === "rejeitar" && !acao?.motivo}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}