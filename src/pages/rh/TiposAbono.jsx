import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/rh/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import Field from "@/components/cadastros/Field";

const CATEGORIAS = [
  { v: "atestado_medico", n: "Atestado médico" },
  { v: "falta_justificada_com_abono", n: "Falta justificada com abono" },
  { v: "falta_justificada_sem_abono", n: "Falta justificada sem abono" },
  { v: "falta_injustificada", n: "Falta injustificada" },
  { v: "atraso_justificado_com_abono", n: "Atraso justificado com abono" },
  { v: "atraso_justificado_sem_abono", n: "Atraso justificado sem abono" },
  { v: "saida_antecipada_autorizada", n: "Saída antecipada autorizada" },
  { v: "esquecimento_ponto", n: "Esquecimento de ponto" },
  { v: "folga_compensatoria", n: "Folga compensatória" },
  { v: "suspensao", n: "Suspensão" },
  { v: "outro", n: "Outro" },
];

const PADROES = [
  { nome: "Atestado médico", categoria: "atestado_medico", abona_falta: true, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: true, exige_aprovacao: true },
  { nome: "Falta justificada com abono", categoria: "falta_justificada_com_abono", abona_falta: true, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Falta justificada sem abono", categoria: "falta_justificada_sem_abono", abona_falta: false, gera_desconto: true, gera_punicao: false, impacta_dsr: true, exige_anexo: false, exige_aprovacao: true },
  { nome: "Falta injustificada", categoria: "falta_injustificada", abona_falta: false, gera_desconto: true, gera_punicao: true, impacta_dsr: true, exige_anexo: false, exige_aprovacao: false },
  { nome: "Atraso justificado com abono", categoria: "atraso_justificado_com_abono", abona_falta: false, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Atraso justificado sem abono", categoria: "atraso_justificado_sem_abono", abona_falta: false, gera_desconto: true, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Saída antecipada autorizada", categoria: "saida_antecipada_autorizada", abona_falta: false, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Esquecimento de ponto", categoria: "esquecimento_ponto", abona_falta: false, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Folga compensatória", categoria: "folga_compensatoria", abona_falta: true, gera_desconto: false, gera_punicao: false, impacta_dsr: false, exige_anexo: false, exige_aprovacao: true },
  { nome: "Suspensão", categoria: "suspensao", abona_falta: false, gera_desconto: true, gera_punicao: true, impacta_dsr: true, exige_anexo: false, exige_aprovacao: true },
];

const empty = () => ({
  nome: "", categoria: "outro", descricao: "",
  abona_falta: false, gera_desconto: false, gera_punicao: false,
  impacta_dsr: false, exige_anexo: false, exige_aprovacao: true, ativo: true,
});

const FlagDot = ({ on }) => <span className={`inline-block w-2 h-2 rounded-full ${on ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />;

export default function TiposAbono() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());
  const [seeding, setSeeding] = useState(false);

  const load = () => base44.entities.TipoAbono.list("-created_date", 200).then(setItems);
  useEffect(() => { load(); }, []);

  const novo = () => { setData(empty()); setOpen(true); };
  const editar = (r) => { setData({ ...empty(), ...r }); setOpen(true); };
  const toggle = async (r) => { await base44.entities.TipoAbono.update(r.id, { ativo: r.ativo === false }); load(); };

  const salvar = async () => {
    if (!data.nome) return;
    if (data.id) { const { id, ...rest } = data; await base44.entities.TipoAbono.update(id, rest); }
    else await base44.entities.TipoAbono.create(data);
    setOpen(false); load();
  };

  const semearPadroes = async () => {
    setSeeding(true);
    try {
      const existentes = await base44.entities.TipoAbono.list("-created_date", 500);
      const categoriasExistentes = new Set(existentes.map((e) => e.categoria));
      const aCriar = PADROES.filter((p) => !categoriasExistentes.has(p.categoria));
      for (const p of aCriar) await base44.entities.TipoAbono.create({ ...p, ativo: true });
      toast.success(aCriar.length === 0 ? "Já existe ao menos um tipo de cada categoria." : `${aCriar.length} tipos padrão criados.`);
      load();
    } finally { setSeeding(false); }
  };

  const catNome = (v) => CATEGORIAS.find((c) => c.v === v)?.n || v;

  return (
    <PageShell title="Abonos e Justificativas" description="Tipos de ausência/atraso e como cada um afeta o ponto, a folha e o DSR."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={semearPadroes} disabled={seeding}><RefreshCw className="w-4 h-4 mr-1.5" />Carregar padrões</Button>
          <Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Novo tipo</Button>
        </div>
      }>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Nome</TableHead><TableHead>Categoria</TableHead>
            <TableHead className="text-center">Abona</TableHead>
            <TableHead className="text-center">Desconto</TableHead>
            <TableHead className="text-center">Punição</TableHead>
            <TableHead className="text-center">DSR</TableHead>
            <TableHead className="text-center">Anexo</TableHead>
            <TableHead className="text-center">Aprovação</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">
                Nenhum tipo cadastrado. Clique em <strong>Carregar padrões</strong> para começar.
              </TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{catNome(r.categoria)}</TableCell>
                <TableCell className="text-center"><FlagDot on={r.abona_falta} /></TableCell>
                <TableCell className="text-center"><FlagDot on={r.gera_desconto} /></TableCell>
                <TableCell className="text-center"><FlagDot on={r.gera_punicao} /></TableCell>
                <TableCell className="text-center"><FlagDot on={r.impacta_dsr} /></TableCell>
                <TableCell className="text-center"><FlagDot on={r.exige_anexo} /></TableCell>
                <TableCell className="text-center"><FlagDot on={r.exige_aprovacao} /></TableCell>
                <TableCell><StatusBadge ativo={r.ativo} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(r)}><Power className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{data.id ? "Editar tipo de abono" : "Novo tipo de abono"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" required><Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Categoria" required>
              <Select value={data.categoria} onValueChange={(v) => setData({ ...data, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.v} value={c.v}>{c.n}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="col-span-2"><Textarea rows={2} value={data.descricao || ""} onChange={(e) => setData({ ...data, descricao: e.target.value })} /></Field>

            <FlagRow label="Abona a falta" hint="Quando aplicado, a falta deixa de contar no espelho."
              checked={data.abona_falta} onChange={(v) => setData({ ...data, abona_falta: v })} id="ab" />
            <FlagRow label="Gera desconto em folha" hint="Aplica desconto proporcional na folha."
              checked={data.gera_desconto} onChange={(v) => setData({ ...data, gera_desconto: v })} id="dt" />
            <FlagRow label="Gera punição administrativa" hint="Registra advertência/suspensão associada."
              checked={data.gera_punicao} onChange={(v) => setData({ ...data, gera_punicao: v })} id="pn" />
            <FlagRow label="Impacta o DSR" hint="Reflete no Descanso Semanal Remunerado."
              checked={data.impacta_dsr} onChange={(v) => setData({ ...data, impacta_dsr: v })} id="ds" />
            <FlagRow label="Exige anexo (documento)" hint="Obriga upload (ex: atestado)."
              checked={data.exige_anexo} onChange={(v) => setData({ ...data, exige_anexo: v })} id="ax" />
            <FlagRow label="Exige aprovação do gestor" hint="Só aplica após aprovação."
              checked={data.exige_aprovacao} onChange={(v) => setData({ ...data, exige_aprovacao: v })} id="ap" />

            <div className="col-span-2 flex items-center gap-3 pt-2 border-t border-border">
              <Switch checked={data.ativo !== false} onCheckedChange={(v) => setData({ ...data, ativo: v })} id="ta-a" />
              <Label htmlFor="ta-a">{data.ativo !== false ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!data.nome}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function FlagRow({ label, hint, checked, onChange, id }) {
  return (
    <div className="flex items-start justify-between gap-3 col-span-2 sm:col-span-1 border border-border rounded-md p-3">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-xs font-medium cursor-pointer">{label}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <Switch id={id} checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}