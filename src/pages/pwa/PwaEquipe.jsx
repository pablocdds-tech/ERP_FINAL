import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { aprovarRegistroPonto } from "@/lib/aprovacoes-service";
import { labelPonto, calcularMinutosTrabalhados, formatMinutos, diagnosticoDia, logAprovacao } from "@/lib/rh-service";
import { format } from "date-fns";

export default function PwaEquipe() {
  const { gestor } = usePwa() || {};
  const [colaboradores, setColaboradores] = useState([]);
  const [registrosPorCol, setRegistrosPorCol] = useState({});
  const [escalasPorCol, setEscalasPorCol] = useState({});
  const [ajuste, setAjuste] = useState(null);

  const hoje = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const [cs, regs, esc] = await Promise.all([
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.RegistroPonto.filter({ data: hoje }),
      base44.entities.Escala.filter({ data: hoje }),
    ]);
    setColaboradores(cs);
    const mr = {}; regs.forEach((r) => { (mr[r.colaborador_id] = mr[r.colaborador_id] || []).push(r); });
    setRegistrosPorCol(mr);
    const me = {}; esc.forEach((e) => { me[e.colaborador_id] = e; });
    setEscalasPorCol(me);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  if (!gestor) {
    return (<div><PageTitle title="Equipe" /><Card className="p-5 text-sm text-muted-foreground">Acesso restrito.</Card></div>);
  }

  const aprovarTodos = async (regs) => {
    for (const r of regs.filter((r) => r.status === "registrado")) await aprovarRegistroPonto(r);
    load();
  };

  const salvarAjuste = async () => {
    if (!ajuste?.registro || !ajuste.novoHorario) return;
    const r = ajuste.registro;
    let usuario_email = null;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
    const novoISO = `${r.data}T${ajuste.novoHorario}:00`;
    const updated = await base44.entities.RegistroPonto.update(r.id, {
      horario: novoISO,
      ajustado: true,
      ajuste_motivo: ajuste.motivo || "",
      ajustado_por: usuario_email,
      horario_original: r.horario,
      origem: "ajuste_gestor",
    });
    await logAprovacao({
      entidade: "RegistroPonto", entidade_id: r.id, acao: "ajustar",
      observacoes: ajuste.motivo, snapshot_antes: r, snapshot_depois: updated,
    });
    setAjuste(null);
    load();
  };

  return (
    <div>
      <PageTitle title="Equipe — Hoje" subtitle={format(new Date(), "dd/MM/yyyy")} />
      {colaboradores.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Sem colaboradores ativos.</Card>
      ) : (
        <div className="space-y-2">
          {colaboradores.map((c) => {
            const regs = (registrosPorCol[c.id] || []).sort((a, b) => a.horario.localeCompare(b.horario));
            const esc = escalasPorCol[c.id];
            const diag = diagnosticoDia(esc, regs);
            const trab = calcularMinutosTrabalhados(regs);
            const pendentes = regs.filter((r) => r.status === "registrado").length;
            return (
              <Card key={c.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {esc?.tipo === "normal" ? `Escala ${esc.hora_entrada}–${esc.hora_saida}` : esc?.tipo || "Sem escala"}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono">{formatMinutos(trab)}</div>
                    {diag.status === "atraso" && <div className="text-amber-700">Atraso {diag.atraso_min}min</div>}
                    {diag.status === "falta" && <div className="text-destructive">Sem entrada</div>}
                  </div>
                </div>
                {regs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {regs.map((r) => (
                      <button key={r.id} onClick={() => setAjuste({ registro: r, novoHorario: format(new Date(r.horario), "HH:mm"), motivo: "" })}
                        className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${r.ajustado ? "border-amber-300 bg-amber-50 text-amber-800" : "border-border hover:bg-muted"}`}>
                        {labelPonto(r.tipo)}: {format(new Date(r.horario), "HH:mm")} <Pencil className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
                {pendentes > 0 && (
                  <Button size="sm" variant="outline" className="h-7 mt-2" onClick={() => aprovarTodos(regs)}>
                    <Check className="w-3 h-3 mr-1" />Aprovar {pendentes} ponto(s)
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!ajuste} onOpenChange={(o) => !o && setAjuste(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar ponto</DialogTitle></DialogHeader>
          {ajuste && (
            <div className="space-y-3">
              <div className="text-sm">
                {labelPonto(ajuste.registro.tipo)} — original: {format(new Date(ajuste.registro.horario), "HH:mm")}
              </div>
              <Input type="time" value={ajuste.novoHorario} onChange={(e) => setAjuste({ ...ajuste, novoHorario: e.target.value })} />
              <Textarea rows={2} placeholder="Motivo do ajuste" value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjuste(null)}>Cancelar</Button>
            <Button onClick={salvarAjuste} disabled={!ajuste?.novoHorario}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}