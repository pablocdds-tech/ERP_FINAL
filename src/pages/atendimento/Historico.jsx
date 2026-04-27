import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquareWarning, Star, Gift, Undo2 } from "lucide-react";
import { format } from "date-fns";
import PageShell from "@/components/atendimento/PageShell";
import StatusBadge from "@/components/atendimento/StatusBadge";
import { motivoLabel } from "@/lib/atendimento-config";

export default function Historico() {
  const [clientes, setClientes] = useState([]);
  const [reclamacoes, setReclamacoes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [cortesias, setCortesias] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Cliente.list(),
      base44.entities.Reclamacao.list(),
      base44.entities.Avaliacao.list(),
      base44.entities.Cortesia.list(),
      base44.entities.Reembolso.list(),
    ]).then(([c, r, a, co, re]) => {
      setClientes(c); setReclamacoes(r); setAvaliacoes(a); setCortesias(co); setReembolsos(re);
    });
  }, []);

  const clientesFiltrados = clientes.filter((c) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return c.nome?.toLowerCase().includes(q) || c.telefone?.includes(busca);
  });

  const cliente = clientes.find((c) => c.id === clienteId);

  // Linha do tempo unificada
  const eventos = [];
  if (cliente) {
    reclamacoes.filter((r) => r.cliente_id === clienteId || (r.cliente_nome && r.cliente_nome === cliente.nome)).forEach((r) => {
      eventos.push({ tipo: "reclamacao", data: r.data, item: r });
    });
    avaliacoes.filter((a) => a.cliente_id === clienteId || (a.cliente_nome && a.cliente_nome === cliente.nome)).forEach((a) => {
      eventos.push({ tipo: "avaliacao", data: a.data, item: a });
    });
    cortesias.filter((c) => c.cliente_id === clienteId || (c.cliente_nome && c.cliente_nome === cliente.nome)).forEach((c) => {
      eventos.push({ tipo: "cortesia", data: c.data, item: c });
    });
    reembolsos.filter((r) => r.cliente_id === clienteId || (r.cliente_nome && r.cliente_nome === cliente.nome)).forEach((r) => {
      eventos.push({ tipo: "reembolso", data: r.data, item: r });
    });
  }
  eventos.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  const ICONS = { reclamacao: MessageSquareWarning, avaliacao: Star, cortesia: Gift, reembolso: Undo2 };
  const COR = { reclamacao: "text-red-600", avaliacao: "text-amber-600", cortesia: "text-blue-600", reembolso: "text-purple-600" };

  return (
    <PageShell title="Histórico por Cliente" description="Linha do tempo de problemas, avaliações, cortesias e reembolsos.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Card className="p-2 max-h-[500px] overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="text-xs text-muted-foreground p-3 text-center">Nenhum cliente encontrado.</div>
            ) : clientesFiltrados.map((c) => (
              <button key={c.id} onClick={() => setClienteId(c.id)}
                className={`w-full text-left p-2 rounded text-sm hover:bg-muted ${clienteId === c.id ? "bg-muted font-medium" : ""}`}>
                <div className="truncate">{c.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{c.telefone || c.email || "—"}</div>
              </button>
            ))}
          </Card>
        </div>

        <div className="md:col-span-2">
          {!cliente ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Selecione um cliente à esquerda.</Card>
          ) : (
            <>
              <Card className="p-4 mb-3">
                <div className="font-medium">{cliente.nome}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {cliente.telefone || "—"} • {cliente.email || "—"} • {cliente.total_pedidos || 0} pedido(s) • Ticket médio R$ {(cliente.ticket_medio || 0).toFixed(2)}
                </div>
              </Card>
              {eventos.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">Sem histórico de atendimento para este cliente.</Card>
              ) : (
                <div className="space-y-2">
                  {eventos.map((ev, i) => {
                    const Icon = ICONS[ev.tipo];
                    return (
                      <Card key={i} className="p-3">
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 ${COR[ev.tipo]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium uppercase text-muted-foreground">{ev.tipo}</span>
                              {ev.data && <span className="text-xs text-muted-foreground">{format(new Date(ev.data), "dd/MM/yy")}</span>}
                              {ev.tipo === "reclamacao" && <StatusBadge status={ev.item.status_tratativa} />}
                            </div>
                            <div className="text-sm mt-0.5">
                              {ev.tipo === "reclamacao" && <>{ev.item.titulo} • <span className="text-muted-foreground">{motivoLabel(ev.item.motivo)}</span></>}
                              {ev.tipo === "avaliacao" && <>{ev.item.nota ? `${ev.item.nota}★` : ""} {typeof ev.item.nps_score === "number" ? `NPS ${ev.item.nps_score}` : ""} {ev.item.comentario && `— ${ev.item.comentario}`}</>}
                              {ev.tipo === "cortesia" && <>Cortesia ({ev.item.tipo}) — R$ {(ev.item.valor_estimado || 0).toFixed(2)}</>}
                              {ev.tipo === "reembolso" && <>Reembolso — R$ {(ev.item.valor || 0).toFixed(2)} • {ev.item.status}</>}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}