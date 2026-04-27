import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/marketing/PageShell";
import { filtrarInativos } from "@/lib/marketing-service";

export default function Inativos() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [dias, setDias] = useState(60);
  useEffect(() => { base44.entities.Cliente.list().then(setClientes); }, []);

  const inativos = filtrarInativos(clientes, dias)
    .filter((c) => c.aceita_marketing !== false)
    .sort((a, b) => (b.total_gasto || 0) - (a.total_gasto || 0));

  return (
    <PageShell title="Clientes Inativos" description="Quem não compra há muito tempo — ideal para campanhas de recuperação."
      actions={
        <Button onClick={() => navigate("/marketing/disparos")} disabled={inativos.length === 0}>
          <Send className="w-4 h-4 mr-1" /> Criar disparo de recuperação
        </Button>
      }>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Sem comprar há (dias)</div>
          <Input type="number" className="w-32" value={dias} onChange={(e) => setDias(parseInt(e.target.value) || 60)} />
        </div>
        <div className="text-sm text-muted-foreground pb-2">{inativos.length} cliente(s) inativos</div>
      </div>
      {inativos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente inativo no critério.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Dias parado</TableHead>
                <TableHead>Total gasto</TableHead>
                <TableHead>Pedidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inativos.map((c) => {
                const d = c.ultima_compra ? differenceInDays(new Date(), new Date(c.ultima_compra)) : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-xs">{c.telefone || "—"}</TableCell>
                    <TableCell className="text-xs">{c.ultima_compra ? format(new Date(c.ultima_compra), "dd/MM/yy") : "—"}</TableCell>
                    <TableCell className="text-xs font-medium text-amber-600">{d} dias</TableCell>
                    <TableCell>R$ {(c.total_gasto || 0).toFixed(2)}</TableCell>
                    <TableCell>{c.total_pedidos || 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}