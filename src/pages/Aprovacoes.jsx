import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, ShoppingCart, FileSignature, ShieldCheck, MessageSquare, Sparkles } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import AprovacaoNfDialog from "@/components/aprovacoes/AprovacaoNfDialog";
import AprovacaoFechamentoDialog from "@/components/aprovacoes/AprovacaoFechamentoDialog";
import { decidirSolicitacao } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

export default function Aprovacoes() {
  const [nf, setNf] = useState([]);
  const [fech, setFech] = useState([]);
  const [sol, setSol] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [dlgNf, setDlgNf] = useState(null);
  const [dlgFech, setDlgFech] = useState(null);

  const load = async () => {
    const [n, f, s, c, l] = await Promise.all([
      base44.entities.NotaFiscalPendente.filter({ status: "pendente" }, "-created_date", 200),
      base44.entities.FechamentoPendente.filter({ status: "pendente" }, "-created_date", 200),
      base44.entities.SolicitacaoRH.filter({ status: "pendente" }, "-created_date", 200),
      base44.entities.Colaborador.list("nome", 500),
      base44.entities.Loja.list(),
    ]);
    setNf(n); setFech(f); setSol(s); setColaboradores(c); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const totais = useMemo(() => ({
    nf: nf.length, fech: fech.length, sol: sol.length,
    total: nf.length + fech.length + sol.length,
  }), [nf, fech, sol]);

  return (
    <div>
      <PageHeader
        title="Central de Aprovações"
        description="Tudo que precisa da sua decisão: notas, fechamentos e solicitações."
      />

      <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">{totais.total} {totais.total === 1 ? "item pendente" : "itens pendentes"}</div>
            <div className="text-xs text-muted-foreground">IA nunca aprova automaticamente — toda aprovação é manual e auditada.</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="nf">
        <TabsList>
          <TabsTrigger value="nf"><FileText className="w-4 h-4 mr-1.5" />NF <Counter n={totais.nf} /></TabsTrigger>
          <TabsTrigger value="fech"><ShoppingCart className="w-4 h-4 mr-1.5" />Fechamentos <Counter n={totais.fech} /></TabsTrigger>
          <TabsTrigger value="sol"><FileSignature className="w-4 h-4 mr-1.5" />Solicitações <Counter n={totais.sol} /></TabsTrigger>
        </TabsList>

        <TabsContent value="nf" className="mt-3 space-y-2">
          {nf.length === 0 ? <Empty texto="Sem NFs pendentes." /> : nf.map((n) => (
            <ItemCard key={n.id}
              icone={<FileText className="w-4 h-4" />}
              titulo={n.fornecedor_nome || n.numero || "Nota fiscal"}
              subtitulo={`R$ ${Number(n.valor_total || 0).toFixed(2)}${n.numero ? ` · NF ${n.numero}` : ""}${n.data_emissao ? ` · ${n.data_emissao}` : ""}`}
              loja={lojaNome(n.loja_id)}
              origem={n.origem}
              ia_conf={n.ia_confianca}
              created={n.created_date}
              acao={<Button onClick={() => setDlgNf(n)}>Revisar</Button>}
            />
          ))}
        </TabsContent>

        <TabsContent value="fech" className="mt-3 space-y-2">
          {fech.length === 0 ? <Empty texto="Sem fechamentos pendentes." /> : fech.map((f) => (
            <ItemCard key={f.id}
              icone={<ShoppingCart className="w-4 h-4" />}
              titulo={`Fechamento ${f.data_referencia || "(sem data)"}`}
              subtitulo={`R$ ${Number(f.total_vendas || 0).toFixed(2)} · canais: ${(f.vendas_por_canal || []).length}`}
              loja={lojaNome(f.loja_id)}
              origem={f.origem}
              ia_conf={f.ia_confianca}
              created={f.created_date}
              acao={<Button onClick={() => setDlgFech(f)}>Revisar</Button>}
            />
          ))}
        </TabsContent>

        <TabsContent value="sol" className="mt-3 space-y-2">
          {sol.length === 0 ? <Empty texto="Sem solicitações pendentes." /> : sol.map((s) => (
            <ItemCard key={s.id}
              icone={<FileSignature className="w-4 h-4" />}
              titulo={`${s.tipo} — ${colNome(s.colaborador_id)}`}
              subtitulo={s.descricao || (s.data_referencia ? `Ref: ${s.data_referencia}` : "")}
              loja={lojaNome(s.loja_id)}
              origem="ERP / PWA"
              created={s.created_date}
              acao={
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={async () => { const r = prompt("Motivo:"); if (r === null) return; await decidirSolicitacao(s, "rejeitada", r); load(); }}>Rejeitar</Button>
                  <Button size="sm" onClick={async () => { const r = prompt("Resposta (opcional):") || ""; await decidirSolicitacao(s, "aprovada", r); load(); }}>Aprovar</Button>
                </div>
              }
            />
          ))}
        </TabsContent>
      </Tabs>

      <AprovacaoNfDialog open={!!dlgNf} record={dlgNf} onClose={() => setDlgNf(null)} onDone={load} />
      <AprovacaoFechamentoDialog open={!!dlgFech} record={dlgFech} onClose={() => setDlgFech(null)} onDone={load} />
    </div>
  );
}

function Counter({ n }) {
  if (!n) return null;
  return <span className="ml-1.5 text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-medium">{n}</span>;
}

function Empty({ texto }) {
  return <Card className="p-8 text-center text-sm text-muted-foreground">{texto}</Card>;
}

function ItemCard({ icone, titulo, subtitulo, loja, origem, ia_conf, created, acao }) {
  return (
    <Card className="p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">{icone}</div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{titulo}</div>
          {subtitulo && <div className="text-xs text-muted-foreground truncate">{subtitulo}</div>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className="font-normal text-[10px]">{loja}</Badge>
            {origem === "whatsapp" ? (
              <Badge variant="outline" className="font-normal text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <MessageSquare className="w-2.5 h-2.5 mr-1" />WhatsApp
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal text-[10px]">{origem}</Badge>
            )}
            {ia_conf != null && (
              <Badge variant="outline" className="font-normal text-[10px]">
                <Sparkles className="w-2.5 h-2.5 mr-1" />IA {Math.round(ia_conf * 100)}%
              </Badge>
            )}
            {created && <span className="text-[10px] text-muted-foreground">{format(new Date(created), "dd/MM HH:mm")}</span>}
          </div>
        </div>
      </div>
      <div>{acao}</div>
    </Card>
  );
}