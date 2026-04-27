import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import ItemPicker from "@/components/operacoes/ItemPicker";
import { registrarMovimentacoes } from "@/lib/operacoes-service";
import { format } from "date-fns";

const TIPO_LABEL = {
  ajuste_positivo: "Ajuste +",
  ajuste_negativo: "Ajuste −",
  perda: "Perda",
};

const empty = () => ({
  tipo: "perda",
  loja_id: "",
  data: new Date().toISOString().slice(0, 10),
  item_tipo: "insumo",
  item_id: "",
  item_nome: "",
  quantidade: 0,
  motivo: "",
  observacoes: "",
});

export default function AjustesPerdas() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [a, l] = await Promise.all([
      base44.entities.AjustePerda.list("-data", 200),
      base44.entities.Loja.list(),
    ]);
    setItems(a); setLojas(l);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((a) => {
    if (tipoFilter !== "todos" && a.tipo !== tipoFilter) return false;
    if (search && !`${a.item_nome || ""} ${a.motivo || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, search, tipoFilter]);

  const salvar = async () => {
    if (!data.loja_id || !data.item_id || !data.quantidade) return;
    setSaving(true);
    const created = await base44.entities.AjustePerda.create({ ...data, status: "lancada" });

    const tipoMov = data.tipo === "perda" ? "perda" : "ajuste";
    let qtd = Number(data.quantidade);
    if (data.tipo === "ajuste_negativo") qtd = -Math.abs(qtd);
    if (data.tipo === "ajuste_positivo") qtd = Math.abs(qtd);
    if (data.tipo === "perda") qtd = Math.abs(qtd); // movimento "perda" sempre subtrai

    await registrarMovimentacoes([{
      tipo: tipoMov,
      item_tipo: data.item_tipo,
      item_id: data.item_id,
      item_nome: data.item_nome,
      quantidade: qtd,
      loja_id: data.loja_id,
      data: data.data,
      motivo: data.motivo,
      origem_tipo: data.tipo === "perda" ? "perda" : "ajuste",
      origem_id: created.id,
    }]);

    setSaving(false);
    setOpen(false);
    setData(empty());
    load();
  };

  return (
    <PageShell
      title="Ajustes e Perdas"
      description="Acertos de saldo e perdas com motivo."
      actions={
        <Button onClick={() => { setData(empty()); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo lançamento
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="ajuste_positivo">Ajuste +</SelectItem>
              <SelectItem value="ajuste_negativo">Ajuste −</SelectItem>
              <SelectItem value="perda">Perda</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhum lançamento.</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell>{a.data ? format(new Date(a.data), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>{TIPO_LABEL[a.tipo] || a.tipo}</TableCell>
                  <TableCell className="font-medium">{a.item_nome}</TableCell>
                  <TableCell>{lojaNome(a.loja_id)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(a.quantidade).toFixed(3)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.motivo || "—"}</TableCell>
                  <TableCell><OperacaoStatusBadge status={a.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(a)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo ajuste / perda</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo" required>
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ajuste_positivo">Ajuste positivo (+)</SelectItem>
                  <SelectItem value="ajuste_negativo">Ajuste negativo (−)</SelectItem>
                  <SelectItem value="perda">Perda</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data" required>
              <Input type="date" value={data.data} onChange={(e) => setData({ ...data, data: e.target.value })} />
            </Field>
            <Field label="Loja" required className="md:col-span-2">
              <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} allowEmpty={false} />
            </Field>
            <Field label="Item" required className="md:col-span-2">
              <ItemPicker
                tipo="ambos"
                value={{ item_tipo: data.item_tipo, item_id: data.item_id, item_nome: data.item_nome }}
                onChange={(v) => setData({ ...data, ...v })}
              />
            </Field>
            <Field label="Quantidade" required>
              <Input type="number" step="0.001" value={data.quantidade ?? ""} onChange={(e) => setData({ ...data, quantidade: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Motivo">
              <Input value={data.motivo} onChange={(e) => setData({ ...data, motivo: e.target.value })} />
            </Field>
            <Field label="Observações" className="md:col-span-2">
              <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !data.loja_id || !data.item_id || !data.quantidade}>
              {saving ? "..." : "Lançar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lançamento</DialogTitle></DialogHeader>
          {viewing && (
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Tipo:</span> {TIPO_LABEL[viewing.tipo]}</div>
              <div><span className="text-muted-foreground">Data:</span> {format(new Date(viewing.data), "dd/MM/yyyy")}</div>
              <div><span className="text-muted-foreground">Item:</span> {viewing.item_nome}</div>
              <div><span className="text-muted-foreground">Loja:</span> {lojaNome(viewing.loja_id)}</div>
              <div><span className="text-muted-foreground">Quantidade:</span> {viewing.quantidade}</div>
              <div><span className="text-muted-foreground">Motivo:</span> {viewing.motivo || "—"}</div>
              {viewing.observacoes && <div><span className="text-muted-foreground">Obs:</span> {viewing.observacoes}</div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}