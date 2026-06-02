import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, LockOpen, RefreshCw, Calculator } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import FechamentoLinha from "@/components/rh/FechamentoLinha";
import FechamentoStatusBadge from "@/components/rh/FechamentoStatusBadge";
import PainelPendenciasFechamento from "@/components/rh/PainelPendenciasFechamento";
import { formatMinutos } from "@/lib/rh-service";
import {
  previaFechamento,
  fecharPeriodo,
  reabrirPeriodo,
  getPeriodo,
  listarPeriodos,
} from "@/lib/fechamento-ponto-service";
import { detectarPendencias } from "@/lib/fechamento-pendencias-service";

function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FechamentoMensal() {
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [lojaId, setLojaId] = useState("");
  const [lojas, setLojas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [periodo, setPeriodo] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [pendencias, setPendencias] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acao, setAcao] = useState(null); // "fechar" | "reabrir"
  const [motivoReabrir, setMotivoReabrir] = useState("");
  const [erro, setErro] = useState(null);

  const carregarHistorico = async () => {
    const [h, l] = await Promise.all([
      listarPeriodos(),
      base44.entities.Loja.list(),
    ]);
    setHistorico(h || []);
    setLojas(l || []);
  };

  useEffect(() => { carregarHistorico(); }, []);

  const carregarPrevia = async () => {
    setLoading(true);
    setErro(null);
    try {
      const [p, prev] = await Promise.all([
        getPeriodo(competencia, lojaId),
        previaFechamento({ competencia, loja_id: lojaId }),
      ]);
      setPeriodo(p);
      setPrevia(prev);
      setPendencias(await detectarPendencias(prev));
    } catch (e) {
      setErro(e?.message || "Falha ao calcular o período.");
    } finally {
      setLoading(false);
    }
  };

  const onFechar = async () => {
    if (!previa) return;
    if (pendencias && pendencias.bloqueios.length > 0) {
      setErro("Existem pendências impeditivas. Resolva-as antes de fechar o período.");
      return;
    }
    if (!confirm(`Confirmar fechamento da competência ${competencia}? Após fechado, os registros do período ficam travados para ajustes.`)) return;
    setAcao("fechar");
    setErro(null);
    try {
      await fecharPeriodo({ competencia, loja_id: lojaId });
      await Promise.all([carregarPrevia(), carregarHistorico()]);
    } catch (e) {
      setErro(e?.message || "Falha ao fechar o período.");
    } finally {
      setAcao(null);
    }
  };

  const onReabrir = async () => {
    if (!periodo) return;
    if (!motivoReabrir.trim()) { setErro("Informe o motivo da reabertura."); return; }
    setAcao("reabrir");
    setErro(null);
    try {
      await reabrirPeriodo({ periodo_id: periodo.id, motivo: motivoReabrir.trim() });
      setMotivoReabrir("");
      await Promise.all([carregarPrevia(), carregarHistorico()]);
    } catch (e) {
      setErro(e?.message || "Falha ao reabrir o período.");
    } finally {
      setAcao(null);
    }
  };

  const fechado = periodo?.status === "fechado";
  const temBloqueio = !!(pendencias && pendencias.bloqueios.length > 0);
  const lojaMap = useMemo(() => Object.fromEntries(lojas.map((l) => [l.id, l.nome])), [lojas]);

  return (
    <PageShell
      title="Fechamento Mensal de Ponto"
      description="Trava o período selecionado e gera totalizadores oficiais por colaborador."
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Competência</div>
            <Input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Loja</div>
            <Select value={lojaId || "__all__"} onValueChange={(v) => setLojaId(v === "__all__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as lojas (corporativo)</SelectItem>
                {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={carregarPrevia} disabled={loading} className="gap-2">
            <Calculator className="w-4 h-4" />
            {loading ? "Calculando..." : "Calcular prévia"}
          </Button>
          {periodo && <FechamentoStatusBadge status={periodo.status} />}
        </div>
        {erro && <div className="text-xs text-destructive mt-2">{erro}</div>}
      </Card>

      {previa && !fechado && (
        <PainelPendenciasFechamento pendencias={pendencias} loading={loading} />
      )}

      {previa && (
        <>
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
              <Bloco label="Colaboradores" valor={previa.linhas.length} />
              <Bloco label="Trabalhado" valor={formatMinutos(previa.totalGeral.total_trabalhado_min)} />
              <Bloco label="HE 50%" valor={formatMinutos(previa.totalGeral.total_he50_min)} />
              <Bloco label="HE 100%" valor={formatMinutos(previa.totalGeral.total_he100_min)} />
              <Bloco label="Noturno" valor={formatMinutos(previa.totalGeral.total_noturno_min)} />
              <Bloco label="Atrasos" valor={formatMinutos(previa.totalGeral.total_atraso_min)} />
              <Bloco label="Faltas" valor={previa.totalGeral.total_faltas} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Período: <span className="font-mono">{previa.data_inicio}</span> → <span className="font-mono">{previa.data_fim}</span>
              </div>
              <div className="sm:ml-auto flex gap-2">
                {!fechado && (
                  <Button onClick={onFechar} disabled={!!acao || previa.linhas.length === 0 || temBloqueio} className="gap-2">
                    <Lock className="w-4 h-4" />
                    {temBloqueio ? "Resolva as pendências" : acao === "fechar" ? "Fechando..." : "Fechar período"}
                  </Button>
                )}
                {fechado && (
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Motivo para reabrir"
                      value={motivoReabrir}
                      onChange={(e) => setMotivoReabrir(e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline" onClick={onReabrir} disabled={!!acao} className="gap-2">
                      <LockOpen className="w-4 h-4" />
                      {acao === "reabrir" ? "Reabrindo..." : "Reabrir"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Trabalhado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>HE 50%</TableHead>
                  <TableHead>HE 100%</TableHead>
                  <TableHead>Noturno</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previa.linhas.length === 0 ? (
                  <TableRow><td colSpan={9} className="text-center py-10 text-sm text-muted-foreground">Nenhum colaborador com batidas no período.</td></TableRow>
                ) : previa.linhas
                  .sort((a, b) => (a.colaborador?.nome || "").localeCompare(b.colaborador?.nome || ""))
                  .map((l) => <FechamentoLinha key={l.colaborador.id} linha={l} />)}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Histórico de fechamentos</h3>
          <Button size="sm" variant="ghost" onClick={carregarHistorico} className="gap-1 h-7">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
        </div>
        {historico.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum fechamento realizado ainda.</div>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead>Competência</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Colaboradores</TableHead>
              <TableHead>Fechado por</TableHead>
              <TableHead>Fechado em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {historico.map((p) => (
                <TableRow key={p.id} className="text-sm">
                  <td className="px-4 py-2 font-mono">{p.competencia}</td>
                  <td className="px-4 py-2">{p.loja_id ? (lojaMap[p.loja_id] || p.loja_id) : "Todas"}</td>
                  <td className="px-4 py-2"><FechamentoStatusBadge status={p.status} /></td>
                  <td className="px-4 py-2">{p.qtd_colaboradores || 0}</td>
                  <td className="px-4 py-2 text-xs">{p.fechado_por || "—"}</td>
                  <td className="px-4 py-2 text-xs">{p.fechado_em ? new Date(p.fechado_em).toLocaleString("pt-BR") : "—"}</td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageShell>
  );
}

function Bloco({ label, valor }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-mono text-sm font-semibold">{valor}</span>
    </div>
  );
}