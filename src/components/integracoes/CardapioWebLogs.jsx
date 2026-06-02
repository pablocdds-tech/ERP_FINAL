import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const fmt = (v) => (v ? new Date(v).toLocaleString("pt-BR") : "—");
const variant = (s) => (s === "erro" ? "destructive" : s === "sucesso" || s === "processado" ? "default" : "secondary");

export function SyncLogs({ logs }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Início</TableHead><TableHead>Status</TableHead><TableHead>Recebidos</TableHead><TableHead>Criados</TableHead><TableHead>Atualizados</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
        <TableBody>
          {logs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhuma sincronização ainda.</TableCell></TableRow> : logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{fmt(l.started_at || l.created_date)}</TableCell>
              <TableCell><Badge variant={variant(l.status)}>{l.status}</Badge></TableCell>
              <TableCell>{l.records_received ?? 0}</TableCell>
              <TableCell>{l.records_created ?? 0}</TableCell>
              <TableCell>{l.records_updated ?? 0}</TableCell>
              <TableCell className="text-xs text-destructive max-w-xs truncate">{l.error_message || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function WebhookEvents({ events }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Recebido</TableHead><TableHead>Evento</TableHead><TableHead>ID externo</TableHead><TableHead>Status</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
        <TableBody>
          {events.length === 0 ? <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum webhook recebido ainda.</TableCell></TableRow> : events.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{fmt(e.created_date)}</TableCell>
              <TableCell>{e.event_type || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{e.external_id || "—"}</TableCell>
              <TableCell><Badge variant={variant(e.status)}>{e.status}</Badge></TableCell>
              <TableCell className="text-xs text-destructive max-w-xs truncate">{e.error_message || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}