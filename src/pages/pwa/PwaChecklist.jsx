import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ListChecks, CheckCircle2 } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";

export default function PwaChecklist() {
  const { colaborador } = usePwa() || {};
  const [checklists, setChecklists] = useState([]);
  const [exec, setExec] = useState(null); // execução em andamento

  useEffect(() => {
    base44.entities.Checklist.filter({ ativo: true }).then(setChecklists);
  }, []);

  const iniciar = async (cl) => {
    setExec({
      checklist_id: cl.id,
      checklist_titulo: cl.titulo,
      loja_id: colaborador?.loja_id,
      colaborador_id: colaborador?.id,
      data: new Date().toISOString().slice(0, 10),
      respostas: (cl.itens || []).map((i) => ({ item_id: i.id, texto: i.texto, feito: false, observacao: "" })),
    });
  };
  const setResp = (idx, k, v) => {
    const arr = [...exec.respostas]; arr[idx] = { ...arr[idx], [k]: v };
    setExec({ ...exec, respostas: arr });
  };
  const concluir = async () => {
    await base44.entities.ChecklistExecucao.create({
      ...exec, concluido: true, concluido_em: new Date().toISOString(),
    });
    setExec(null);
  };

  if (exec) {
    const total = exec.respostas.length;
    const feitos = exec.respostas.filter((r) => r.feito).length;
    return (
      <div>
        <PageTitle title={exec.checklist_titulo} subtitle={`${feitos}/${total} concluídos`}
          action={<Button size="sm" variant="outline" onClick={() => setExec(null)}>Voltar</Button>} />
        <div className="space-y-2">
          {exec.respostas.map((r, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-start gap-3">
                <Checkbox checked={r.feito} onCheckedChange={(v) => setResp(idx, "feito", !!v)} className="mt-0.5" />
                <div className="flex-1">
                  <div className={`text-sm ${r.feito ? "line-through text-muted-foreground" : ""}`}>{r.texto}</div>
                  {r.feito && (
                    <Textarea rows={1} placeholder="Observação (opcional)" className="mt-2 text-xs"
                      value={r.observacao || ""} onChange={(e) => setResp(idx, "observacao", e.target.value)} />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Button className="w-full mt-4 h-12" disabled={feitos < total} onClick={concluir}>
          {feitos < total ? `${total - feitos} item(ns) restante(s)` : "Concluir checklist"}
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