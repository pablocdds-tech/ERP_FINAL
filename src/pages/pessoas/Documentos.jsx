import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";
import { format } from "date-fns";

const TIPOS = ["rg", "cpf", "ctps", "comprovante_residencia", "atestado", "exame_medico", "contrato", "outro"];
const empty = () => ({ colaborador_id: "", tipo: "outro", nome: "", arquivo_url: "", data_emissao: "", data_validade: "" });

export default function Documentos() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [colFilter, setColFilter] = useState("todos");
  const [dialog, setDialog] = useState(false);
  const [data, setData] = useState(empty());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [d, c] = await Promise.all([
      base44.entities.Documento.list("-created_date", 500),
      base44.entities.Colaborador.list("nome", 500),
    ]);
    setItems(d); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);

  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((i) =>
    colFilter === "todos" || i.colaborador_id === colFilter
  ), [items, colFilter]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setData((d) => ({ ...d, arquivo_url: file_url, nome: d.nome || file.name }));
    setUploading(false);
  };

  const salvar = async () => {
    if (!data.colaborador_id || !data.nome || !data.arquivo_url) return;
    setSaving(true);
    await base44.entities.Documento.create(data);
    setSaving(false); setData(empty()); setDialog(false); load();
  };

  const remover = async (d) => {
    if (!confirm("Remover documento?")) return;
    await base44.entities.Documento.delete(d.id);
    load();
  };

  return (
    <PageShell
      title="Documentos"
      description="Atestados, contratos e arquivos dos colaboradores."
      actions={<Button onClick={() => { setData(empty()); setDialog(true); }}><Plus className="w-4 h-4 mr-1.5" />Novo documento</Button>}
    >
      <Card className="p-4 mb-4">
        <Select value={colFilter} onValueChange={setColFilter}>
          <SelectTrigger className="md:w-[300px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos colaboradores</SelectItem>
            {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Sem documentos.</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{colNome(d.colaborador_id)}</TableCell>
                <TableCell><span className="text-xs uppercase text-muted-foreground">{d.tipo}</span></TableCell>
                <TableCell>{d.nome}</TableCell>
                <TableCell className="text-sm">{d.data_emissao ? format(new Date(d.data_emissao + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{d.data_validade ? format(new Date(d.data_validade + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell><a href={d.arquivo_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">Abrir <ExternalLink className="w-3 h-3" /></a></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remover(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onOpenChange={(o) => !o && setDialog(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Colaborador" required>
              <Select value={data.colaborador_id} onValueChange={(v) => setData({ ...data, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Nome do documento" required>
              <Input value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} />
            </Field>
            <Field label="Arquivo" required>
              <Input type="file" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
              {uploading && <div className="text-xs text-muted-foreground mt-1">Enviando...</div>}
              {data.arquivo_url && <div className="text-xs text-emerald-700 mt-1">✓ Arquivo enviado</div>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emissão"><Input type="date" value={data.data_emissao || ""} onChange={(e) => setData({ ...data, data_emissao: e.target.value })} /></Field>
              <Field label="Validade"><Input type="date" value={data.data_validade || ""} onChange={(e) => setData({ ...data, data_validade: e.target.value })} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !data.colaborador_id || !data.nome || !data.arquivo_url}>{saving ? "..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}