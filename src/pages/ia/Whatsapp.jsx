import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";

const STATUS_MSG = {
  pendente: "bg-slate-100 text-slate-700",
  processando: "bg-blue-100 text-blue-700",
  enviado: "bg-emerald-100 text-emerald-700",
  recebido: "bg-violet-100 text-violet-700",
  erro: "bg-red-100 text-red-700",
};

export default function Whatsapp() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => { base44.entities.MensagemWhatsapp.list("-created_date", 200).then(setMsgs); }, []);

  return (
    <PageShell title="Notificações WhatsApp" description="Canal de notificação. Não é fonte primária — toda resposta vira tarefa, chamado, checklist, ponto ou solicitação.">
      {msgs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem registrada.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {msgs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.created_date ? format(new Date(m.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{m.direcao || "saida"}</Badge></TableCell>
                  <TableCell className="text-xs">{m.telefone || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">{m.mensagem || m.texto || "-"}</TableCell>
                  <TableCell><Badge className={STATUS_MSG[m.status] || ""}>{m.status || "-"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}