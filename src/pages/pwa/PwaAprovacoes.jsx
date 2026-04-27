import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, ShoppingCart, FileSignature, Clock, MessageSquare, Sparkles } from "lucide-react";
import { usePwa } from "@/lib/PwaContext";
import AprovacaoNfDialog from "@/components/aprovacoes/AprovacaoNfDialog";
import AprovacaoFechamentoDialog from "@/components/aprovacoes/AprovacaoFechamentoDialog";
import { decidirSolicitacao, aprovarRegistroPonto, rejeitarRegistroPonto } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

export default function PwaAprovacoes() {
  const { gestor } = usePwa() || {};
  const [nf, setNf] = useState([]);
  const [fech, setFech] = useState([]);
  const [sol, setSol] = useState([]);
  const [pontos, setPontos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [dlgNf, setDlgNf] = useState(null);
  const [dlgFech, setDlgFech] = useState(null);

  const load = async () => {
    const [n, f, s, p, c] = await Promise.all([
      base44.entities.NotaFiscalPendente.filter({ status: "pendente" }, "-created_date", 100),
      base44.entities.FechamentoPendente.filter({ status: "pendente" }, "-created_date", 100),
      base44.entities.SolicitacaoRH.filter({ status: "pendente" }, "-created_date", 100),
      base44.entities.RegistroPonto.filter({ status: "registrado" }, "-horario", 100),
      base44.entities.Colaborador.list("nome", 200),
    ]);
    setNf(n); setFech(f); setSol(s); setPontos(p); setColaboradores(c);
  };
  useEffect(() => { if (gestor) load(); }, [gestor]);

  if (!gestor) {
    return <div className="text-center py-10 text-sm text-muted-foreground">Acesso restrito a gestores.</div>;
  }

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Aprovações</h1>
      <p className="text-xs text-muted-foreground mb-4">{nf.length + fech.length + sol.length + pontos.length} pendente(s)</p>

      <Tabs defaultValue="nf">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="nf" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />NF{nf.length > 0 && ` (${nf.length})`}</TabsTrigger>
          <TabsTrigger value="fech" className="text-xs"><ShoppingCart className="w-3.5 h-3.5 mr-1" />Fech{fech.length > 0 && ` (${fech.length})`}</TabsTrigger>
          <TabsTrigger value="sol" className="text-xs"><FileSignature className="w-3.5 h-3.5 mr-1" />Sol{sol.length > 0 && ` (${sol.length})`}</TabsTrigger>
          <TabsTrigger value="ponto" className="text-xs"><Clock className="w-3.5 h-3.5 mr-1" />Pto{pontos.length > 0 && ` (${pontos.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="nf" className="mt-3 space-y-2">
          {nf.length === 0 ? <Empty /> : nf.map((n) => (
            <Card key={n.id} className="p-3">
              <div className="flex items-start gap-2 mb-2">
                {n.arquivo_url && <img src={n.arquivo_url} alt="" className="w-14 h-14 object-cover rounded border" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{n.fornecedor_nome || n.numero || "NF"}</div>
                  <div className="text-xs text-muted-foreground">R$ {Number(n.valor_total || 0).toFixed(2)}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {n.origem === "whatsapp" && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"><MessageSquare className="w-2 h-2 mr-0.5" />WA</Badge>}
                    {n.ia_confianca != null && <Badge variant="outline" className="text-[9px]"><Sparkles className="w-2 h-2 mr-0.5" />{Math.round(n.ia_confianca * 100)}%</Badge>}
                  </div>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={() => setDlgNf(n)}>Revisar</Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fech" className="mt-3 space-y-2">
          {fech.length === 0 ? <Empty /> : fech.map((f) => (
            <Card key={f.id} className="p-3">
              <div className="flex items-start gap-2 mb-2">
                {f.arquivo_url && <img src={f.arquivo_url} alt="" className="w-14 h-14 object-cover rounded border" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Fechamento {f.data_referencia || ""}</div>
                  <div className="text-xs text-muted-foreground">R$ {Number(f.total_vendas || 0).toFixed(2)}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.origem === "whatsapp" && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"><MessageSquare className="w-2 h-2 mr-0.5" />WA</Badge>}
                    {f.ia_confianca != null && <Badge variant="outline" className="text-[9px]"><Sparkles className="w-2 h-2 mr-0.5" />{Math.round(f.ia_confianca * 100)}%</Badge>}
                  </div>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={() => setDlgFech(f)}>Revisar</Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sol" className="mt-3 space-y-2">
          {sol.length === 0 ? <Empty /> : sol.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="font-medium text-sm">{s.tipo} — {colNome(s.colaborador_id)}</div>
              {s.descricao && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.descricao}</div>}
              {s.anexo_url && <a href={s.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-primary mt-1 inline-block">Ver anexo</a>}
              <div className="flex gap-1.5 mt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={async () => { const r = prompt("Motivo:"); if (r === null) return; await decidirSolicitacao(s, "rejeitada", r); load(); }}>Rejeitar</Button>
                <Button size="sm" className="flex-1" onClick={async () => { await decidirSolicitacao(s, "aprovada", ""); load(); }}>Aprovar</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ponto" className="mt-3 space-y-2">
          {pontos.length === 0 ? <Empty /> : pontos.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="font-medium text-sm">{colNome(p.colaborador_id)}</div>
              <div className="text-xs text-muted-foreground">{p.tipo} — {p.horario ? format(new Date(p.horario), "dd/MM HH:mm") : ""}</div>
              <div className="flex gap-1.5 mt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={async () => { const r = prompt("Motivo:"); if (r === null) return; await rejeitarRegistroPonto(p, r); load(); }}>Rejeitar</Button>
                <Button size="sm" className="flex-1" onClick={async () => { await aprovarRegistroPonto(p); load(); }}>Aprovar</Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AprovacaoNfDialog open={!!dlgNf} record={dlgNf} onClose={() => setDlgNf(null)} onDone={load} />
      <AprovacaoFechamentoDialog open={!!dlgFech} record={dlgFech} onClose={() => setDlgFech(null)} onDone={load} />
    </div>
  );
}

function Empty() {
  return <Card className="p-6 text-center text-sm text-muted-foreground">Nada pendente aqui.</Card>;
}