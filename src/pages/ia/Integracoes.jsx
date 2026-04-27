import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import PageShell from "@/components/ia/PageShell";
import IntegracaoDialog from "@/components/ia/IntegracaoDialog";

export default function Integracoes() {
  const [lista, setLista] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  const carregar = () => base44.entities.Integracao.list("-created_date").then(setLista);
  useEffect(() => { carregar(); }, []);

  const novo = () => { setEdit(null); setOpen(true); };
  const editar = (i) => { setEdit(i); setOpen(true); };
  const excluir = async (i) => {
    if (!confirm(`Excluir integração "${i.nome}"?`)) return;
    await base44.entities.Integracao.delete(i.id);
    carregar();
  };

  return (
    <PageShell
      title="Integrações"
      description="Cadastre webhooks, fluxos n8n e canais WhatsApp."
      actions={<Button onClick={novo}><Plus className="w-4 h-4 mr-1" /> Nova integração</Button>}
    >
      {lista.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma integração cadastrada.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell><Badge variant="outline">{i.tipo}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{i.url_webhook || "-"}</TableCell>
                  <TableCell className="text-xs">{(i.eventos_assinados || []).length}</TableCell>
                  <TableCell>
                    <Badge className={i.ultimo_status === "ok" ? "bg-emerald-100 text-emerald-700" : i.ultimo_status === "erro" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}>
                      {i.ultimo_status || "nunca"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{i.ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => editar(i)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => excluir(i)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <IntegracaoDialog open={open} onOpenChange={setOpen} integracao={edit} onSaved={carregar} />
    </PageShell>
  );
}