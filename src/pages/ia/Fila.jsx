import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";

export default function Fila() {
  const [eventos, setEventos] = useState([]);
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.EventoAutomacao.list("-created_date", 100),
      base44.entities.MensagemWhatsapp.list("-created_date", 100),
    ]).then(([ev, m]) => {
      setEventos(ev.filter((e) => e.status === "pendente" || e.status === "processando"));
      setMsgs(m.filter((x) => x.status === "pendente" || x.status === "processando"));
    });
  }, []);

  return (
    <PageShell title="Fila de Mensagens" description="Eventos e mensagens aguardando processamento.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 border-b font-medium">Eventos na fila ({eventos.length})</div>
          {eventos.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Nada pendente.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Destino</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {eventos.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.tipo_evento}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.destino}</Badge></TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-700">{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="p-4 border-b font-medium">WhatsApp na fila ({msgs.length})</div>
          {msgs.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Nada pendente.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {msgs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{m.created_date ? format(new Date(m.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                    <TableCell className="text-xs">{m.telefone || "-"}</TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-700">{m.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}