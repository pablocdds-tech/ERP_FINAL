import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import Field from "@/components/cadastros/Field";
import { format } from "date-fns";

const TIPOS = { rg: "RG", cpf: "CPF", ctps: "CTPS", comprovante_residencia: "Comp. residência", atestado: "Atestado", exame_medico: "Exame médico", contrato: "Contrato", outro: "Outro" };

export default function Documentos() {
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [colF, setColF] = useState("todos");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ tipo: "outro" });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [d, c] = await Promise.all([
      base44.entities.Documento.list("-created_date", 500),
      base44.entities.Colaborador.list(),
    ]);
    setItems(d); setColaboradores(c);
  };
  useEffect(() => { load(); }, []);
  const colNome = (id) => colaboradores.find((c) => c.id === id)?.nome || "—";
  const filtered = items.filter((i) => colF === "todos" || i.colaborador_id === colF);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setData({ ...data, arquivo_url: file_url, nome: data.nome || f.name });
    setUploading(false);
  };
  const salvar = async () => {
    if (!data.colaborador_id || !data.arquivo_url || !data.nome) return;
    await base44.entities.Documento.create(data);
    setOpen(false); setData({ tipo: "outro" }); load();
  };
  const remover = async (r) => { await base44.entities.Documento.delete(r.id); load(); };

  return (
    <PageShell title="Documentos" description="Atestados, contratos e arquivos do colaborador."
      actions={<Button onClick={() => { setData({ tipo: "outro" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Novo</Button>}>
      <Card className="p-4 mb-4">
        <Select value={colF} onValueChange={setColF}>
          <SelectTrigger className="w-full md:w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos colaboradores</SelectItem>
            {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Nome</TableHead>
            <TableHead>Validade</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Sem documentos.</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id} className="hover:bg-muted/30">
                <TableCell>{colNome(d.colaborador_id)}</TableCell>
                <TableCell>{TIPOS[d.tipo]}</TableCell>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-xs">{d.data_validade ? format(new Date(d.data_validade), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <a href={d.arquivo_url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remover(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Colaborador" required className="col-span-2">
              <Select value={data.colaborador_id || ""} onValueChange={(v) => setData({ ...data, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tipo" required>
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Validade"><Input type="date" value={data.data_validade || ""} onChange={(e) => setData({ ...data, data_validade: e.target.value })} /></Field>
            <Field label="Nome" required className="col-span-2"><Input value={data.nome || ""} onChange={(e) => setData({ ...data, nome: e.target.value })} /></Field>
            <Field label="Arquivo" required className="col-span-2">
              <Input type="file" onChange={onFile} disabled={uploading} />
              {uploading && <span className="text-xs text-muted-foreground">Enviando...</span>}
              {data.arquivo_url && <span className="text-xs text-emerald-700">Arquivo enviado ✓</span>}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!data.colaborador_id || !data.arquivo_url || !data.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}