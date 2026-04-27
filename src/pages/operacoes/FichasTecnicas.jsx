import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Power } from "lucide-react";
import PageShell from "@/components/operacoes/PageShell";
import StatusBadge from "@/components/cadastros/StatusBadge";
import FichaTecnicaDialog from "@/components/operacoes/dialogs/FichaTecnicaDialog";

export default function FichasTecnicas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    setItems(await base44.entities.FichaTecnica.list("-created_date", 200));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((f) =>
    !search || (f.produto_nome || "").toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const toggleAtivo = async (f) => {
    await base44.entities.FichaTecnica.update(f.id, { ativo: f.ativo === false });
    load();
  };

  return (
    <PageShell
      title="Fichas Técnicas"
      description="Defina os insumos consumidos para produzir cada produto."
      actions={
        <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova ficha
        </Button>
      }
    >
      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Produto</TableHead>
                <TableHead>Rendimento</TableHead>
                <TableHead>Ingredientes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhuma ficha cadastrada.</TableCell></TableRow>
              ) : filtered.map((f) => (
                <TableRow key={f.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{f.produto_nome || "—"}</TableCell>
                  <TableCell>{f.rendimento ? `${f.rendimento} ${f.unidade_medida || ""}` : "—"}</TableCell>
                  <TableCell>{f.ingredientes?.length || 0}</TableCell>
                  <TableCell><StatusBadge ativo={f.ativo} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "view", record: f })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, mode: "edit", record: f })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAtivo(f)}>
                        <Power className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <FichaTecnicaDialog
        open={dialog.open}
        mode={dialog.mode}
        record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </PageShell>
  );
}