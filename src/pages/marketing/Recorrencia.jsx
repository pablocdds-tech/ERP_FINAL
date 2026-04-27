import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/marketing/PageShell";

export default function Recorrencia() {
  const [clientes, setClientes] = useState([]);
  useEffect(() => { base44.entities.Cliente.list().then(setClientes); }, []);

  const total = clientes.length;
  const recorrentes = clientes.filter((c) => (c.total_pedidos || 0) >= 3).length;
  const vip = clientes.filter((c) => c.status === "vip").length;
  const novos = clientes.filter((c) => (c.total_pedidos || 0) <= 1).length;
  const ticketMedio = total > 0 ? clientes.reduce((s, c) => s + (c.ticket_medio || 0), 0) / total : 0;

  const stats = [
    { label: "Total de clientes", v: total },
    { label: "Novos (1 pedido)", v: novos },
    { label: "Recorrentes (3+ pedidos)", v: recorrentes, highlight: true },
    { label: "VIP (10+ pedidos)", v: vip },
    { label: "Taxa de recorrência", v: total > 0 ? `${((recorrentes / total) * 100).toFixed(1)}%` : "0%" },
    { label: "Ticket médio geral", v: `R$ ${ticketMedio.toFixed(2)}` },
  ];

  return (
    <PageShell title="Recorrência" description="Quantos clientes voltam e qual o ticket médio.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className={`p-4 ${s.highlight ? "border-emerald-300" : ""}`}>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.v}</div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}