import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Field from "@/components/cadastros/Field";
import { CheckCircle2, AlertTriangle, FileSignature, UserX } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import { diagnosticoDia } from "@/lib/rh-service";

/**
 * Tratamento de Ponto — gestor aplica abono/justificativa em FALTA ou ATRASO
 * sem editar batidas. Gera SolicitacaoRH já aprovada (com tipo + categoria),
 * mantendo o RegistroPonto intacto e a trilha de auditoria.
 */
export default function TratamentoPonto() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [lojaId, setLojaId] = useState("");
  const [lojas, setLojas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [tiposAbono, setTiposAbono] = useState([]);

  const [dialog, setDialog] = useState(null); // {colab, situacao}
  const [tipoAbonoId, setTipoAbonoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const filtroR = lojaId ? { data, loja_id: lojaId } : { data };
    const filtroE = lojaId ? { data, loja_id: lojaId } : { data };
    const [l, c, r, e, t] = await Promise.all([
      base44.entities.Loja.list(),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.RegistroPonto.filter(filtroR, "-horario", 5000),
      base44.entities.Escala.filter(filtroE, "-data", 5000),
      base44.entities.TipoAbono.filter({ ativo: true }).catch(() => []),
    ]);
    setLojas(l || []); setColaboradores(c || []); setRegistros(r || []);
    setEscalas(e || []); setTiposAbono(t || []);
  };
  useEffect(() => { carregar(); }, [data, lojaId]); // eslint-disable-line

  const linhas = useMemo(() => {
    const colabs = lojaId ? colaboradores.filter((c) => c.loja_id === lojaId) : colaboradores;
    return colabs.map((c) => {
      const regs = registros.filter((r) => r.colaborador_id === c.id);
      const escala = escalas.find((e) => e.colaborador_id === c.id) || null;
      const diag = diagnosticoDia(escala, regs);
      return { c, regs, escala, diag };
    }).filter((x) => x.diag.status === "falta" || x.diag.status === "atraso");
  }, [colaboradores, registros, escalas, lojaId]);

  const abrirDialog = (linha, situacao) => {
    setDialog({ ...linha, situacao });
    setTipoAbonoId(""); setObservacao("");
  };

  const aplicar = async () => {
    if (!dialog || !tipoAbonoId) return;
    setSalvando(true);
    let usuario_email = null;
    try { usuario_email = (await base44.auth.me())?.email; } catch { /* */ }
    const tipo = tiposAbono.find((t) => t.id === tipoAbonoId);
    await base44.entities.SolicitacaoRH.create({
      colaborador_id: dialog.c.id,
      loja_id: dialog.c.loja_id || lojaId || "",
      tipo: dialog.situacao === "falta" ? "abono_falta" : "abono_atraso",
      categoria: tipo?.categoria || "outro",
      tipo_abono_id: tipoAbonoId,
      data_referencia: data,
      descricao: observacao || tipo?.nome || "",
      status: "aprovada",
      aprovado_por: usuario_email,
      aprovado_em: new Date().toISOString(),
      origem: "gestor_tratamento",
    });
    setSalvando(false);
    setDialog(null);
    await carregar();
  };

  return (
    <PageShell
      title="Tratamento de Ponto"
      description="Aplique abonos e justificativas em faltas e atrasos do dia, sem editar batidas."
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="md:w-[180px]" />
          <Select value={lojaId || "__all__"} onValueChange={(v) => setLojaId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="md:ml-auto self-center text-sm text-muted-foreground">
            {linhas.length} caso{linhas.length === 1 ? "" : "s"} a tratar
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Colaborador</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Escala</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-600" />Nada a tratar hoje.</TableCell></TableRow>
            ) : linhas.map(({ c, escala, diag }) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-xs">
                  {diag.status === "falta" ? (
                    <span className="inline-flex items-center gap-1 text-destructive font-medium"><UserX className="w-3 h-3" />Falta</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium"><AlertTriangle className="w-3 h-3" />Atraso {diag.atraso_min}min</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {escala?.tipo === "normal" ? `${escala.hora_entrada}–${escala.hora_saida}` : escala?.tipo || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="h-7" onClick={() => abrirDialog({ c, escala, diag }, diag.status)}>
                    <FileSignature className="w-3 h-3 mr-1" />Tratar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tratar {dialog?.situacao === "falta" ? "falta" : "atraso"} — {dialog?.c?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Tipo de abono / justificativa" required>
              <Select value={tipoAbonoId} onValueChange={setTipoAbonoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tiposAbono.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Cadastre tipos de abono em Configurações do Ponto.</div>}
                  {tiposAbono.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Observação">
              <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: atestado médico anexado, atraso por chuva, etc." />
            </Field>
            <div className="text-[11px] text-muted-foreground">
              A batida original NÃO é alterada. O abono fica registrado como SolicitaçãoRH aprovada,
              com trilha de auditoria, e será considerado no fechamento.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={aplicar} disabled={!tipoAbonoId || salvando}>{salvando ? "..." : "Aplicar abono"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}