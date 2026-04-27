import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Pencil } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { format } from "date-fns";

const empty = () => ({
  numero: "",
  serie: "",
  fornecedor_id: "",
  loja_id: "",
  compra_id: "",
  data_emissao: "",
  data_entrada: new Date().toISOString().slice(0, 10),
  valor_total: 0,
  chave_acesso: "",
  observacoes: "",
  status: "recebida",
});

export default function NotasFiscais() {
  const [items, setItems] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [n, f, l, c] = await Promise.all([
      base44.entities.NotaFiscal.list("-data_entrada", 200),
      base44.entities.Fornecedor.list(),
      base44.entities.Loja.list(),
      base44.entities.Compra.list("-data", 200),
    ]);
    setItems(n); setFornecedores(f); setLojas(l); setCompras(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fornecedorNome = (id) => fornecedores.find((f) => f.id === id)?.nome || "—";
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${n.numero || ""} ${fornecedorNome(n.fornecedor_id)} ${n.chave_acesso || ""}`.toLowerCase().includes(s);
  }), [items, search, fornecedores]);

  const novo = () => { setEditing(null); setData(empty()); setOpen(true); };
  const editar = (n) => { setEditing(n); setData({ ...n }); setOpen(true); };

  const salvar = async () => {
    if (!data.fornecedor_id) return;
    setSaving(true);
    if (editing) {
      const { id, ...rest } = data;
      await base44.entities.NotaFiscal.update(id, rest);
    } else {
      await base44.entities.NotaFiscal.create(data);
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  return (
    <PageShell
      title="Notas Fiscais"
      description="Notas vinculadas a fornecedores. Pode ser associada a uma compra."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1.5" />Nova nota</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Entrada</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma nota.</TableCell></TableRow>
              ) : filtered.map((n) => (
                <TableRow key={n.id} className="hover:bg-muted/30">
                  <TableCell>{n.data_entrada ? format(new Date(n.data_entrada), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{n.numero || "—"}</TableCell>
                  <TableCell>{n.serie || "—"}</TableCell>
                  <TableCell>{fornecedorNome(n.fornecedor_id)}</TableCell>
                  <TableCell>{lojaNome(n.loja_id)}</TableCell>
                  <TableCell>R$ {Number(n.valor_total || 0).toFixed(2)}</TableCell>
                  <TableCell><OperacaoStatusBadge status={n.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editar(n)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar nota fiscal" : "Nova nota fiscal"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Número">
              <Input value={data.numero} onChange={(e) => setData({ ...data, numero: e.target.value })} />
            </Field>
            <Field label="Série">
              <Input value={data.serie} onChange={(e) => setData({ ...data, serie: e.target.value })} />
            </Field>
            <Field label="Fornecedor" required>
              <Select value={data.fornecedor_id || ""} onValueChange={(v) => setData({ ...data, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Loja">
              <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} />
            </Field>
            <Field label="Data emissão">
              <Input type="date" value={data.data_emissao || ""} onChange={(e) => setData({ ...data, data_emissao: e.target.value })} />
            </Field>
            <Field label="Data entrada">
              <Input type="date" value={data.data_entrada || ""} onChange={(e) => setData({ ...data, data_entrada: e.target.value })} />
            </Field>
            <Field label="Valor total (R$)">
              <Input type="number" step="0.01" value={data.valor_total ?? ""} onChange={(e) => setData({ ...data, valor_total: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Compra vinculada (opcional)">
              <Select value={data.compra_id || "__none__"} onValueChange={(v) => setData({ ...data, compra_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {compras.map((c) => <SelectItem key={c.id} value={c.id}>{c.numero || c.id.slice(0, 6)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chave de acesso" className="md:col-span-2">
              <Input value={data.chave_acesso || ""} onChange={(e) => setData({ ...data, chave_acesso: e.target.value })} />
            </Field>
            <Field label="Observações" className="md:col-span-2">
              <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !data.fornecedor_id}>
              {saving ? "..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}