import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, FileText, Receipt, AlertCircle, Check, X } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import {
  aprovarNotaFiscalPendente, rejeitarNotaFiscalPendente,
  aprovarFechamentoPendente, rejeitarFechamentoPendente,
  decidirSolicitacao,
} from "@/lib/aprovacoes-service";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function PwaAprovacoes() {
  const { gestor } = usePwa() || {};
  const [nfs, setNfs] = useState([]);
  const [fechs, setFechs] = useState([]);
  const [sols, setSols] = useState([]);
  const [acao, setAcao] = useState(null);
  // acao = { tipo, item, decisao, motivo }

  const load = async () => {
    const [a, b, c] = await Promise.all([
      base44.entities.NotaFiscalPendente.filter({ status: "pendente" }, "-created_date", 100),
      base44.entities.FechamentoPendente.filter({ status: "pendente" }, "-created_date", 100),
      base44.entities.SolicitacaoRH.filter({ status: "pendente" }, "-created_date", 100),
    ]);
    setNfs(a); setFechs(b); setSols(c);
  };
  useEffect(() => { load(); }, []);

  if (!gestor) {
    return (
      <div>
        <PageTitle title="Aprovações" />
        <Card className="p-5 text-sm text-muted-foreground">Apenas gestores acessam a central de aprovações.</Card>
      </div>
    );
  }

  const executar = async () => {
    if (!acao) return;
    const { tipo, item, decisao, motivo } = acao;
    if (tipo === "nf") {
      if (decisao === "aprovar") await aprovarNotaFiscalPendente(item, motivo);
      else await rejeitarNotaFiscalPendente(item, motivo);
    } else if (tipo === "fech") {
      if (decisao === "aprovar") await aprovarFechamentoPendente(item, motivo);
      else await rejeitarFechamentoPendente(item, motivo);
    } else if (tipo === "sol") {
      await decidirSolicitacao(item, decisao === "aprovar" ? "aprovada" : "rejeitada", motivo);
    }
    setAcao(null);
    load();
  };

  const total = nfs.length + fechs.length + sols.length;

  return (
    <div>
      <PageTitle title="Aprovações" subtitle={`${total} pendência(s)`} />

      <Tabs defaultValue="nf">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="nf"><Receipt className="w-3.5 h-3.5 mr-1" /> NF ({nfs.length})</TabsTrigger>
          <TabsTrigger value="fech"><FileText className="w-3.5 h-3.5 mr-1" /> Fech. ({fechs.length})</TabsTrigger>
          <TabsTrigger value="sol"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> RH ({sols.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="nf" className="mt-3 space-y-2">
          {nfs.length === 0 ? <EmptyState /> : nfs.map((n) => (
            <Card key={n.id} className="p-3">
              <Cabecalho titulo={`NF ${n.numero || "—"} • ${n.fornecedor_nome || "—"}`} origem={n.origem} confianca={n.ia_confianca} />
              <div className="text-xs mt-2 space-y-0.5">
                <div>Valor: <strong>R$ {Number(n.valor_total || 0).toFixed(2)}</strong></div>
                {n.data_emissao && <div>Emissão: {format(new Date(n.data_emissao), "dd/MM/yyyy")}</div>}
                {n.fornecedor_cnpj && <div>CNPJ: {n.fornecedor_cnpj}</div>}
                {n.arquivo_url && <a href={n.arquivo_url} target="_blank" rel="noreferrer" className="text-primary underline">Ver arquivo</a>}
              </div>
              <BotoesAcao onAprovar={() => setAcao({ tipo: "nf", item: n, decisao: "aprovar", motivo: "" })}
                onRejeitar={() => setAcao({ tipo: "nf", item: n, decisao: "rejeitar", motivo: "" })} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fech" className="mt-3 space-y-2">
          {fechs.length === 0 ? <EmptyState /> : fechs.map((f) => (
            <Card key={f.id} className="p-3">
              <Cabecalho titulo={`Fechamento ${f.data_referencia ? format(new Date(f.data_referencia), "dd/MM/yyyy") : ""}`} origem={f.origem} confianca={f.ia_confianca} />
              <div className="text-xs mt-2">
                Total: <strong>R$ {Number(f.total_vendas || 0).toFixed(2)}</strong>
                {(f.vendas_por_canal || []).length > 0 && (
                  <div className="mt-1 text-muted-foreground">
                    {f.vendas_por_canal.map((v, i) => <div key={i}>{v.canal_nome}: R$ {Number(v.valor || 0).toFixed(2)}</div>)}
                  </div>
                )}
              </div>
              {f.arquivo_url && <a href={f.arquivo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver arquivo</a>}
              <BotoesAcao onAprovar={() => setAcao({ tipo: "fech", item: f, decisao: "aprovar", motivo: "" })}
                onRejeitar={() => setAcao({ tipo: "fech", item: f, decisao: "rejeitar", motivo: "" })} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sol" className="mt-3 space-y-2">
          {sols.length === 0 ? <EmptyState /> : sols.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="text-sm font-medium">{s.tipo}</div>
              <div className="text-xs text-muted-foreground">{s.descricao || "—"}</div>
              {s.data_referencia && <div className="text-xs mt-1">Para {format(new Date(s.data_referencia), "dd/MM/yyyy")}</div>}
              {s.anexo_url && <a href={s.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver anexo</a>}
              <BotoesAcao onAprovar={() => setAcao({ tipo: "sol", item: s, decisao: "aprovar", motivo: "" })}
                onRejeitar={() => setAcao({ tipo: "sol", item: s, decisao: "rejeitar", motivo: "" })} />
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Card className="p-3 mt-4 text-[11px] text-muted-foreground flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div>IA nunca aprova automaticamente. Toda decisão é gravada em auditoria. Para corrigir antes de aprovar, abra a tela completa no <Link to="/financeiro" className="underline">ERP</Link>.</div>
      </Card>

      <Dialog open={!!acao} onOpenChange={(o) => !o && setAcao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{acao?.decisao === "aprovar" ? "Aprovar" : "Rejeitar"}</DialogTitle></DialogHeader>
          <Textarea rows={3} placeholder="Observação (opcional)"
            value={acao?.motivo || ""} onChange={(e) => setAcao({ ...acao, motivo: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcao(null)}>Cancelar</Button>
            <Button onClick={executar}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Cabecalho({ titulo, origem, confianca }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="text-sm font-medium flex-1 min-w-0">{titulo}</div>
      <div className="text-[10px] text-muted-foreground text-right shrink-0">
        <div className="uppercase">{origem}</div>
        {typeof confianca === "number" && <div>IA {Math.round(confianca * 100)}%</div>}
      </div>
    </div>
  );
}
function BotoesAcao({ onAprovar, onRejeitar }) {
  return (
    <div className="flex gap-2 mt-3">
      <Button size="sm" className="flex-1" onClick={onAprovar}><Check className="w-3.5 h-3.5 mr-1" />Aprovar</Button>
      <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={onRejeitar}><X className="w-3.5 h-3.5 mr-1" />Rejeitar</Button>
    </div>
  );
}
function EmptyState() {
  return <Card className="p-6 text-center text-xs text-muted-foreground">Sem pendências.</Card>;
}