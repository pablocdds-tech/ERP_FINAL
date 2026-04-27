import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";
import { AGENTS, STATUS_AGENT } from "@/lib/ia-config";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filtroAgent, setFiltroAgent] = useState("_all");
  const [filtroStatus, setFiltroStatus] = useState("_all");

  useEffect(() => { base44.entities.AgentLog.list("-created_date", 200).then(setLogs); }, []);

  const filtrados = logs.filter((l) =>
    (filtroAgent === "_all" || l.agent_chave === filtroAgent) &&
    (filtroStatus === "_all" || l.status === filtroStatus)
  );

  return (
    <PageShell title="Logs de Agents" description="Histórico de ações sugeridas e executadas pelos agents.">
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filtroAgent} onValueChange={setFiltroAgent}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os agents</SelectItem>
            {AGENTS.map((a) => <SelectItem key={a.chave} value={a.chave}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="processando">Processando</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum log encontrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alvo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.created_date ? format(new Date(l.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{l.agent_nome || l.agent_chave}</TableCell>
                  <TableCell className="text-xs">{l.acao}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.tipo}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_AGENT[l.status] || ""}>{l.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entidade_alvo || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}