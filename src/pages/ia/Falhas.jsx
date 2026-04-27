import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AlertOctagon } from "lucide-react";
import PageShell from "@/components/ia/PageShell";

export default function Falhas() {
  const [eventos, setEventos] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.EventoAutomacao.filter({ status: "erro" }, "-created_date", 100),
      base44.entities.AgentLog.filter({ status: "erro" }, "-created_date", 100),
    ]).then(([e, l]) => { setEventos(e); setLogs(l); });
  }, []);

  return (
    <PageShell title="Falhas de Integração" description="Erros de envio, recebimento e execução de agents.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 border-b font-medium flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-600" /> Eventos com erro ({eventos.length})
          </div>
          {eventos.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Nenhum erro.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Evento</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
              <TableBody>
                {eventos.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.created_date ? format(new Date(e.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                    <TableCell className="text-xs">{e.tipo_evento}</TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[260px] truncate">{e.erro_detalhe || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="p-4 border-b font-medium flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-600" /> Agents com erro ({logs.length})
          </div>
          {logs.length === 0 ? (
            <div className="p-6 text-sm text-center text-muted-foreground">Nenhum erro.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Agent</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.created_date ? format(new Date(l.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{l.agent_chave}</Badge></TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[260px] truncate">{l.erro_detalhe || l.acao || "-"}</TableCell>
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