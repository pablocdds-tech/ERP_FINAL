import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";
import { STATUS_EVENTO } from "@/lib/ia-config";

export default function N8N() {
  const [eventos, setEventos] = useState([]);
  useEffect(() => {
    base44.entities.EventoAutomacao.filter({ destino: "n8n" }, "-created_date", 200).then(setEventos);
  }, []);

  return (
    <PageShell title="Fluxos n8n" description="Eventos enviados aos webhooks n8n. O n8n também pode enviar eventos de volta.">
      {eventos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum evento enviado ao n8n.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo de evento</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Enviado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.created_date ? format(new Date(e.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{e.tipo_evento}</TableCell>
                  <TableCell className="text-xs">{e.entidade_origem || "-"}</TableCell>
                  <TableCell><Badge className={STATUS_EVENTO[e.status] || ""}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs">{e.tentativas || 0}</TableCell>
                  <TableCell className="text-xs">{e.enviado_em ? format(new Date(e.enviado_em), "dd/MM HH:mm") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}