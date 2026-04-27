import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp } from "lucide-react";
import PageShell from "@/components/atendimento/PageShell";
import { agruparPorMotivo, tempoMedioResposta, detectarRecorrentes, calcularNPS } from "@/lib/atendimento-service";
import { motivoLabel } from "@/lib/atendimento-config";

export default function Indicadores() {
  const [reclamacoes, setReclamacoes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [cortesias, setCortesias] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [lojas, setLojas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Reclamacao.list(),
      base44.entities.Avaliacao.list(),
      base44.entities.Cortesia.list(),
      base44.entities.Reembolso.list(),
      base44.entities.Loja.list(),
    ]).then(([r, a, c, re, l]) => {
      setReclamacoes(r); setAvaliacoes(a); setCortesias(c); setReembolsos(re); setLojas(l);
    });
  }, []);

  const totalRec = reclamacoes.length;
  const abertas = reclamacoes.filter((r) => ["aberta", "em_tratativa", "aguardando_cliente"].includes(r.status_tratativa)).length;
  const resolvidas = reclamacoes.filter((r) => r.status_tratativa === "resolvida").length;
  const motivos = agruparPorMotivo(reclamacoes);
  const tempoResp = tempoMedioResposta(reclamacoes);
  const recorrentes = detectarRecorrentes(reclamacoes);
  const nps = calcularNPS(avaliacoes);
  const totalCortesias = cortesias.reduce((s, c) => s + (Number(c.valor_estimado) || 0), 0);
  const totalReembolsos = reembolsos.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const taxaResolucao = totalRec > 0 ? (resolvidas / totalRec) * 100 : 0;

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const cards = [
    { l: "Reclamações totais", v: totalRec },
    { l: "Em aberto", v: abertas, alert: abertas > 0 },
    { l: "Resolvidas", v: resolvidas, highlight: true },
    { l: "Taxa de resolução", v: `${taxaResolucao.toFixed(1)}%` },
    { l: "Tempo médio de resposta", v: tempoResp > 0 ? `${tempoResp.toFixed(1)}h` : "—" },
    { l: "NPS", v: nps.total > 0 ? nps.nps.toFixed(0) : "—" },
    { l: "Cortesias (R$)", v: `R$ ${totalCortesias.toFixed(2)}` },
    { l: "Reembolsos (R$)", v: `R$ ${totalReembolsos.toFixed(2)}` },
    { l: "Custo total atendimento", v: `R$ ${(totalCortesias + totalReembolsos).toFixed(2)}` },
  ];

  return (
    <PageShell title="Indicadores" description="Visão consolidada da experiência do cliente.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {cards.map((c, i) => (
          <Card key={i} className={`p-4 ${c.highlight ? "border-emerald-300" : ""} ${c.alert ? "border-amber-300" : ""}`}>
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="text-2xl font-semibold mt-1">{c.v}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 border-b">
            <div className="font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Principais motivos</div>
            <div className="text-xs text-muted-foreground mt-1">Reclamações agrupadas por motivo (todo o histórico).</div>
          </div>
          {motivos.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Sem dados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Motivo</TableHead><TableHead>Qtd</TableHead><TableHead>%</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {motivos.map((m) => (
                  <TableRow key={m.motivo}>
                    <TableCell>{motivoLabel(m.motivo)}</TableCell>
                    <TableCell className="font-medium">{m.qtd}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {totalRec > 0 ? ((m.qtd / totalRec) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="p-4 border-b">
            <div className="font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Problemas recorrentes (30 dias)</div>
            <div className="text-xs text-muted-foreground mt-1">Mesmo motivo + mesma loja com 3+ ocorrências em 30 dias.</div>
          </div>
          {recorrentes.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Nenhum padrão recorrente detectado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Loja</TableHead><TableHead>Motivo</TableHead><TableHead>Ocorrências</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {recorrentes.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{lojaNome(r.loja_id)}</TableCell>
                    <TableCell>{motivoLabel(r.motivo)}</TableCell>
                    <TableCell className="font-semibold text-amber-600">{r.qtd}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}