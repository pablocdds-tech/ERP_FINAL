import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "@/components/financeiro/PageShell";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import LojaMultiSelect from "@/components/cadastros/LojaMultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, RefreshCw } from "lucide-react";

const vazio = {
  nome: "", telefone: "", loja_padrao: "", lojas_permitidas: [],
  pode_enviar_lancamento: true, pode_confirmar_lancamento: false,
  ativo: true, observacoes: "",
};

const soNumeros = (v) => String(v || "").replace(/\D/g, "");
const fmtData = (v) => v ? new Date(v).toLocaleString("pt-BR") : "—";

export default function FuncionariosWhatsapp() {
  const [rows, setRows] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vazio);
  const [f, setF] = useState({ q: "", telefone: "", loja: "all", ativo: "all", enviar: "all", confirmar: "all" });

  const load = async () => {
    setLoading(true);
    const [funcs, lojasData] = await Promise.all([
      base44.entities.funcionarios_whatsapp.list("-updated_date", 500),
      base44.entities.Loja.list("nome", 500),
    ]);
    setRows(funcs || []);
    setLojas(lojasData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtrados = useMemo(() => rows.filter((r) => {
    const q = f.q.toLowerCase();
    if (q && !String(r.nome || "").toLowerCase().includes(q)) return false;
    if (f.telefone && !String(r.telefone || "").includes(soNumeros(f.telefone))) return false;
    if (f.loja !== "all" && r.loja_padrao !== f.loja) return false;
    if (f.ativo !== "all" && String(!!r.ativo) !== f.ativo) return false;
    if (f.enviar !== "all" && String(!!r.pode_enviar_lancamento) !== f.enviar) return false;
    if (f.confirmar !== "all" && String(!!r.pode_confirmar_lancamento) !== f.confirmar) return false;
    return true;
  }), [rows, f]);

  const novo = () => { setForm({ ...vazio }); setOpen(true); };
  const editar = (r) => { setForm({ ...vazio, ...r, lojas_permitidas: r.lojas_permitidas || [] }); setOpen(true); };

  const salvar = async () => {
    const now = new Date().toISOString();
    const data = { ...form, telefone: soNumeros(form.telefone), atualizado_em: now };
    if (form.id) await base44.entities.funcionarios_whatsapp.update(form.id, data);
    else await base44.entities.funcionarios_whatsapp.create({ ...data, criado_em: now });
    setOpen(false);
    await load();
  };

  const toggleAtivo = async (r) => {
    await base44.entities.funcionarios_whatsapp.update(r.id, { ativo: !r.ativo, atualizado_em: new Date().toISOString() });
    await load();
  };

  return (
    <PageShell
      title="Funcionários WhatsApp"
      description="Telefones autorizados a enviar pré-lançamentos financeiros pelo WhatsApp."
      actions={<div className="flex gap-2"><Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Atualizar</Button><Button onClick={novo}><Plus className="w-4 h-4" /> Novo telefone</Button></div>}
    >
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <Input placeholder="Nome" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <Input placeholder="Telefone" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
        <Select value={f.loja} onValueChange={(v) => setF({ ...f, loja: v })}><SelectTrigger><SelectValue placeholder="Loja padrão" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as lojas</SelectItem>{lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select>
        <Select value={f.ativo} onValueChange={(v) => setF({ ...f, ativo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Ativo/Inativo</SelectItem><SelectItem value="true">Ativo</SelectItem><SelectItem value="false">Inativo</SelectItem></SelectContent></Select>
        <Select value={f.enviar} onValueChange={(v) => setF({ ...f, enviar: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Pode enviar</SelectItem><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent></Select>
        <Select value={f.confirmar} onValueChange={(v) => setF({ ...f, confirmar: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Pode confirmar</SelectItem><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent></Select>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Loja padrão</TableHead><TableHead>Permissões</TableHead><TableHead>Criado</TableHead><TableHead>Atualizado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}>Carregando...</TableCell></TableRow> : filtrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}<div>{r.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</div></TableCell>
                <TableCell className="font-mono">{r.telefone}</TableCell>
                <TableCell>{lojaNome(r.loja_padrao)}</TableCell>
                <TableCell className="space-x-1"><Badge variant={r.pode_enviar_lancamento ? "default" : "secondary"}>Enviar: {r.pode_enviar_lancamento ? "sim" : "não"}</Badge><Badge variant={r.pode_confirmar_lancamento ? "default" : "secondary"}>Confirmar: {r.pode_confirmar_lancamento ? "sim" : "não"}</Badge></TableCell>
                <TableCell>{fmtData(r.criado_em || r.created_date)}</TableCell>
                <TableCell>{fmtData(r.atualizado_em || r.updated_date)}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => toggleAtivo(r)}>{r.ativo ? "Desativar" : "Ativar"}</Button><Button size="icon" variant="ghost" onClick={() => editar(r)}><Pencil className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Editar telefone" : "Novo telefone autorizado"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1"><span className="text-sm font-medium">Nome</span><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Telefone internacional</span><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: soNumeros(e.target.value) })} placeholder="5584996031591" /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Loja padrão</span><LojaSingleSelect value={form.loja_padrao} onChange={(v) => setForm({ ...form, loja_padrao: v })} emptyLabel="Selecione" /></label>
            <label className="space-y-1"><span className="text-sm font-medium">Lojas permitidas</span><LojaMultiSelect value={form.lojas_permitidas || []} onChange={(v) => setForm({ ...form, lojas_permitidas: v })} /></label>
            <label className="flex items-center justify-between rounded-lg border p-3"><span>Pode enviar lançamento</span><Switch checked={!!form.pode_enviar_lancamento} onCheckedChange={(v) => setForm({ ...form, pode_enviar_lancamento: v })} /></label>
            <label className="flex items-center justify-between rounded-lg border p-3"><span>Pode confirmar lançamento</span><Switch checked={!!form.pode_confirmar_lancamento} onCheckedChange={(v) => setForm({ ...form, pode_confirmar_lancamento: v })} /></label>
            <label className="flex items-center justify-between rounded-lg border p-3"><span>Ativo</span><Switch checked={!!form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Observações</span><Textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar} disabled={!form.nome || !soNumeros(form.telefone)}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}