import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";
import { STATUS_EVENTO } from "@/lib/ia-config";

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [destino, setDestino] = useState("_all");

  useEffect(() => { base44.entities.EventoAutomacao.list("-created_date", 200).then(setEventos); }, []);

  const filtrados = eventos.filter((e) => destino === "_all" || e.destino === destino);

  return (
    <PageShell title="Eventos de Automação" description="Eventos enviados e recebidos pelo sistema.">
      <div className="flex gap-3 mb-4">
        <Select value={destino} onValueChange={setDestino}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos destinos</SelectItem>
            <SelectItem value="n8n">n8n</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="interno">Interno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum evento registrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.created_date ? format(new Date(e.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{e.tipo_evento}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.origem}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.destino}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_EVENTO[e.status] || ""}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs">{e.tentativas || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}