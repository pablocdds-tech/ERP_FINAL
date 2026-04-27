import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageShell from "@/components/ia/PageShell";

export default function Respostas() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    base44.entities.MensagemWhatsapp.list("-created_date", 200).then((all) =>
      setMsgs(all.filter((m) => m.direcao === "entrada" || m.direcao === "recebida"))
    );
  }, []);

  return (
    <PageShell title="Respostas Recebidas" description="Toda resposta deve atualizar uma entidade real (tarefa, chamado, checklist, ponto ou solicitação).">
      {msgs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma resposta recebida.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Texto</TableHead>
                <TableHead>Vinculada a</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {msgs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.created_date ? format(new Date(m.created_date), "dd/MM HH:mm") : "-"}</TableCell>
                  <TableCell className="text-xs">{m.telefone || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate">{m.mensagem || m.texto || "-"}</TableCell>
                  <TableCell className="text-xs">
                    {m.entidade_destino ? <Badge variant="outline">{m.entidade_destino}</Badge> : <span className="text-muted-foreground">não vinculada</span>}
                  </TableCell>
                  <TableCell><Badge className={m.processada ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{m.processada ? "processada" : "pendente"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}