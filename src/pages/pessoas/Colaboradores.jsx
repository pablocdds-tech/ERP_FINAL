import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil } from "lucide-react";
import PageShell from "@/components/rh/PageShell";
import ColaboradorDialog from "@/components/rh/ColaboradorDialog";

const STATUS_COLOR = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  afastado: "bg-amber-50 text-amber-700 border-amber-200",
  desligado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Colaboradores() {
  const [items, setItems] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    const [c, ca, l] = await Promise.all([
      base44.entities.Colaborador.list("-created_date", 500),
      base44.entities.Cargo.list(),
      base44.entities.Loja.list(),
    ]);
    setItems(c); setCargos(ca); setLojas(l);
  };
  useEffect(() => { load(); }, []);

  const cargoNome = (id) => cargos.find((c) => c.id === id)?.nome || "—";
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((i) => {
    if (statusFilter !== "todos" && i.status !== statusFilter) return false;
    if (search && !`${i.nome} ${i.cpf || ""} ${i.email || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, statusFilter, search]);

  return (
    <PageShell
      title="Colaboradores"
      description="Cadastro de pessoas, vínculos e perfil de acesso ao PWA."
      actions={<Button onClick={() => setDialog({ open: true, mode: "create", record: null })}><Plus className="w-4 h-4 mr-1.5" />Novo colaborador</Button>}
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nome, CPF ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil PWA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Nenhum colaborador.</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{cargoNome(c.cargo_id)}</TableCell>
                  <TableCell>{lojaNome(c.loja_id)}</TableCell>
                  <TableCell className="text-sm">{c.email || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="font-normal">{c.perfil_pwa === "gestor" ? "Gestor" : "Funcionário"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`font-normal ${STATUS_COLOR[c.status] || ""}`}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: c })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "edit", record: c })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ColaboradorDialog
        open={dialog.open} mode={dialog.mode} record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))} onSaved={load}
      />
    </PageShell>
  );
}