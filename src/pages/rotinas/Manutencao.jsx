import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Wrench } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/rotinas/PageShell";
import StatusBadgeAtivo from "@/components/cadastros/StatusBadge";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import Field from "@/components/cadastros/Field";
import { calcularProximaExecucao, gerarOSDePlano } from "@/lib/rotinas-service";

const empty = () => ({ nome: "", frequencia: "mensal", ativo: true });

export default function Manutencao() {
  const [items, setItems] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());

  const load = async () => {
    const [p, eq, co, fo] = await Promise.all([
      base44.entities.ManutencaoPlano.list("proxima_execucao", 200),
      base44.entities.Equipamento.list(),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.Fornecedor.filter({ ativo: true }),
    ]);
    setItems(p); setEquipamentos(eq); setColaboradores(co); setFornecedores(fo);
  };
  useEffect(() => { load(); }, []);

  const equipNome = (id) => equipamentos.find((e) => e.id === id)?.nome || "—";

  const novo = () => {
    setData({ ...empty(), proxima_execucao: calcularProximaExecucao({ frequencia: "mensal" }) });
    setOpen(true);
  };
  const editar = (r) => { setData({ ...r }); setOpen(true); };
  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.ManutencaoPlano.update(id, rest); }
    else await base44.entities.ManutencaoPlano.create(data);
    setOpen(false); load();
  };

  const gerarOS = async (plano) => {
    if (!window.confirm(`Gerar OS preventiva para "${plano.nome}"?`)) return;
    await gerarOSDePlano(plano);
    await load();
    alert("OS gerada. Veja em Ordens de Serviço.");
  };

  return (
    <PageShell
      title="Planos de Manutenção"
      description="Manutenção preventiva agendada por equipamento."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo plano</Button>}
    >
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Equipamento</TableHead>
            <TableHead>Frequência</TableHead><TableHead>Próxima</TableHead>
            <TableHead className="text-right">Custo est.</TableHead>
            <TableHead>Ativo</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem planos.</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-xs">{equipNome(p.equipamento_id)}</TableCell>
                <TableCell className="text-xs">{p.frequencia}</TableCell>
                <TableCell className="text-xs">{p.proxima_execucao ? format(new Date(p.proxima_execucao), "dd/MM/yy") : "—"}</TableCell>
                <TableCell className="text-xs text-right font-mono">R$ {Number(p.custo_estimado || 0).toFixed(2)}</TableCell>
                <TableCell><StatusBadgeAtivo ativo={p.ativo} /></TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerar OS agora" onClick={() => gerarOS(p)}>
                    <Wrench className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{data.id ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" required className="col-span-2"><Input value={data.nome || ""} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Equipamento">
              <Select value={data.equipamento_id || "__none__"} onValueChange={(v) => setData({ ...data, equipamento_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} /></Field>
            <Field label="Frequência">
              <Select value={data.frequencia} onValueChange={(v) => setData({ ...data, frequencia: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Próxima execução"><Input type="date" value={data.proxima_execucao || ""} onChange={(e) => setData({ ...data, proxima_execucao: e.target.value })} /></Field>
            <Field label="Responsável">
              <Select value={data.responsavel_id || "__none__"} onValueChange={(v) => setData({ ...data, responsavel_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fornecedor">
              <Select value={data.fornecedor_id || "__none__"} onValueChange={(v) => setData({ ...data, fornecedor_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome_fantasia}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Custo estimado (R$)"><Input type="number" step="0.01" value={data.custo_estimado || ""} onChange={(e) => setData({ ...data, custo_estimado: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Instruções" className="col-span-2"><Textarea rows={3} value={data.instrucoes || ""} onChange={(e) => setData({ ...data, instrucoes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}