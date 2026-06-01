import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, KeyRound, Eye, WifiOff, AlertTriangle } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { aprovarRegistroPonto, rejeitarRegistroPonto } from "@/lib/aprovacoes-service";
import { format } from "date-fns";

const TIPO_LABEL = {
  entrada: "Entrada",
  intervalo_saida: "Saída intervalo",
  intervalo_volta: "Volta intervalo",
  saida: "Saída",
};

function motivoExcecao(r) {
  if (r.fallback_pin) return { icon: KeyRound, label: "PIN (fallback)", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  if (r.ia_resultado === "baixa_confianca") return { icon: Eye, label: "Baixa confiança facial", cls: "bg-orange-100 text-orange-800 border-orange-200" };
  if (r.origem === "ajuste_gestor") return { icon: AlertTriangle, label: "Ajustado pelo gestor", cls: "bg-amber-100 text-amber-800 border-amber-200" };
  if (r.origem === "manual") return { icon: WifiOff, label: "Lançado manualmente", cls: "bg-blue-100 text-blue-800 border-blue-200" };
  return { icon: AlertTriangle, label: r.ia_motivo || "Revisão", cls: "bg-amber-100 text-amber-800 border-amber-200" };
}

export default function PontosPendentes() {
  const [registros, setRegistros] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState(null);

  const carregar = async () => {
    const [r, c, l] = await Promise.all([
      base44.entities.RegistroPonto.filter({ status: "pendente_revisao" }, "-horario", 1000),
      base44.entities.Colaborador.list("", 5000),
      base44.entities.Loja.list(),
    ]);
    setRegistros(r || []); setColaboradores(c || []); setLojas(l || []);
  };
  useEffect(() => { carregar(); }, []);

  const colMap = useMemo(() => Object.fromEntries(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const lojaMap = useMemo(() => Object.fromEntries(lojas.map((l) => [l.id, l])), [lojas]);

  const lista = registros
    .filter((r) => !filtroLoja || (r.loja_batida_id || r.loja_id) === filtroLoja)
    .filter((r) => {
      if (!busca) return true;
      const c = colMap[r.colaborador_id];
      return c?.nome?.toLowerCase().includes(busca.toLowerCase());
    });

  const aprovar = async (r) => {
    setAcao(r.id);
    await aprovarRegistroPonto(r);
    await carregar();
    setAcao(null);
  };

  const rejeitar = async (r) => {
    const motivo = prompt("Motivo da rejeição:") || "";
    if (!motivo.trim()) return;
    setAcao(r.id);
    await rejeitarRegistroPonto(r, motivo.trim());
    await carregar();
    setAcao(null);
  };

  return (
    <PageShell
      title="Pontos Pendentes de Revisão"
      description="Apenas exceções: PIN, baixa confiança facial, ajuste manual ou lançamento offline."
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Buscar por colaborador..." value={busca} onChange={(e) => setBusca(e.target.value)} className="md:w-[280px]" />
          <Select value={filtroLoja || "__all__"} onValueChange={(v) => setFiltroLoja(v === "__all__" ? "" : v)}>
            <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="md:ml-auto text-sm text-muted-foreground self-center">
            {lista.length} pendência{lista.length === 1 ? "" : "s"}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Data/Hora</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Loja</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">Sem exceções para revisar 🎉</TableCell></TableRow>
            ) : lista.map((r) => {
              const c = colMap[r.colaborador_id];
              const loja = lojaMap[r.loja_batida_id || r.loja_id];
              const m = motivoExcecao(r);
              const Icon = m.icon;
              const busy = acao === r.id;
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="text-xs whitespace-nowrap">
                    <div>{format(new Date(r.horario), "dd/MM/yyyy")}</div>
                    <div className="font-mono">{format(new Date(r.horario), "HH:mm")}</div>
                  </TableCell>
                  <TableCell className="font-medium">{c?.nome || r.colaborador_id}</TableCell>
                  <TableCell className="text-xs">{TIPO_LABEL[r.tipo] || r.tipo}</TableCell>
                  <TableCell className="text-xs">{loja?.nome || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${m.cls}`}><Icon className="w-3 h-3" />{m.label}</Badge>
                    {r.ia_motivo && r.ia_resultado === "baixa_confianca" && (
                      <div className="text-[10px] text-muted-foreground mt-1">{r.ia_motivo}</div>
                    )}
                    {r.ajuste_motivo && (
                      <div className="text-[10px] text-muted-foreground mt-1">{r.ajuste_motivo}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => aprovar(r)} className="h-7"><Check className="w-3 h-3 mr-1" />Aprovar</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => rejeitar(r)} className="h-7 text-destructive"><X className="w-3 h-3 mr-1" />Rejeitar</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}