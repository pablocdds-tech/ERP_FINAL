import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ListChecks, Check, X } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { gerarOcorrenciasDeChecklist } from "@/lib/rotinas-service";

export default function PwaChecklist() {
  const { colaborador } = usePwa() || {};
  const [checklists, setChecklists] = useState([]);
  const [exec, setExec] = useState(null); // execução em andamento
  const [checklist, setChecklist] = useState(null);

  useEffect(() => {
    base44.entities.Checklist.filter({ ativo: true }).then(setChecklists);
  }, []);

  const iniciar = (cl) => {
    setChecklist(cl);
    setExec({
      checklist_id: cl.id,
      checklist_titulo: cl.titulo,
      loja_id: colaborador?.loja_id,
      colaborador_id: colaborador?.id,
      data: new Date().toISOString().slice(0, 10),
      respostas: (cl.itens || []).map((i) => ({ item_id: i.id, texto: i.texto, feito: null, observacao: "" })),
    });
  };
  const setResp = (idx, k, v) => {
    const arr = [...exec.respostas]; arr[idx] = { ...arr[idx], [k]: v };
    setExec({ ...exec, respostas: arr });
  };
  const concluir = async () => {
    const created = await base44.entities.ChecklistExecucao.create({
      ...exec, concluido: true, concluido_em: new Date().toISOString(),
    });
    if (checklist?.gera_ocorrencia !== false) {
      await gerarOcorrenciasDeChecklist({ execucao: created, checklist });
    }
    setExec(null); setChecklist(null);
  };

  if (exec) {
    const total = exec.respostas.length;
    const respondidos = exec.respostas.filter((r) => r.feito === true || r.feito === false).length;
    const naoConformes = exec.respostas.filter((r) => r.feito === false).length;
    return (
      <div>
        <PageTitle title={exec.checklist_titulo} subtitle={`${respondidos}/${total} respondidos${naoConformes > 0 ? ` • ${naoConformes} não conforme(s)` : ""}`}
          action={<Button size="sm" variant="outline" onClick={() => { setExec(null); setChecklist(null); }}>Voltar</Button>} />
        <div className="space-y-2">
          {exec.respostas.map((r, idx) => (
            <Card key={idx} className="p-3">
              <div className="text-sm mb-2">{r.texto}</div>
              <div className="flex gap-2">
                <Button size="sm" variant={r.feito === true ? "default" : "outline"}
                  className={r.feito === true ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  onClick={() => setResp(idx, "feito", true)}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Conforme
                </Button>
                <Button size="sm" variant={r.feito === false ? "default" : "outline"}
                  className={r.feito === false ? "bg-destructive hover:bg-destructive/90" : ""}
                  onClick={() => setResp(idx, "feito", false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Não conforme
                </Button>
              </div>
              {r.feito === false && (
                <Textarea rows={2} placeholder="Descreva o problema..." className="mt-2 text-xs"
                  value={r.observacao || ""} onChange={(e) => setResp(idx, "observacao", e.target.value)} />
              )}
            </Card>
          ))}
        </div>
        <Button className="w-full mt-4 h-12" disabled={respondidos < total} onClick={concluir}>
          {respondidos < total ? `${total - respondidos} item(ns) restante(s)` : `Concluir${naoConformes > 0 ? ` (gera ${naoConformes} ocorrência${naoConformes > 1 ? "s" : ""})` : ""}`}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Checklists" subtitle="Selecione um checklist para executar" />
      {checklists.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground text-center">Nenhum checklist disponível.</Card>
      ) : (
        <div className="space-y-2">
          {checklists.map((cl) => (
            <Card key={cl.id} className="p-3 cursor-pointer hover:border-foreground/30" onClick={() => iniciar(cl)}>
              <div className="flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{cl.titulo}</div>
                  <div className="text-xs text-muted-foreground">{(cl.itens || []).length} itens • {cl.frequencia}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}