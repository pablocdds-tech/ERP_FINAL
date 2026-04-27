import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import PageShell from "@/components/marketing/PageShell";
import { filtrarInativos } from "@/lib/marketing-service";

export default function Indicadores() {
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [campanhas, setCampanhas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Cliente.list(),
      base44.entities.PedidoCliente.list(),
      base44.entities.Campanha.list(),
    ]).then(([c, p, ca]) => { setClientes(c); setPedidos(p); setCampanhas(ca); });
  }, []);

  const totalClientes = clientes.length;
  const inativos = filtrarInativos(clientes, 60).length;
  const recorrentes = clientes.filter((c) => (c.total_pedidos || 0) >= 3).length;
  const receita = pedidos.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
  const ticket = pedidos.length > 0 ? receita / pedidos.length : 0;
  const desconto = pedidos.reduce((s, p) => s + (Number(p.valor_desconto) || 0), 0);
  const investimento = campanhas.reduce((s, c) => s + (Number(c.investimento) || 0), 0);
  const roi = investimento > 0 ? ((receita - investimento) / investimento) * 100 : null;
  const ativas = campanhas.filter((c) => c.status === "ativa").length;

  const cards = [
    { l: "Clientes na base", v: totalClientes },
    { l: "Recorrentes", v: recorrentes },
    { l: "Inativos (60d+)", v: inativos, alert: inativos > 0 },
    { l: "Receita total", v: `R$ ${receita.toFixed(2)}` },
    { l: "Ticket médio", v: `R$ ${ticket.toFixed(2)}` },
    { l: "Desconto concedido", v: `R$ ${desconto.toFixed(2)}` },
    { l: "Investimento em campanhas", v: `R$ ${investimento.toFixed(2)}` },
    { l: "Campanhas ativas", v: ativas },
    { l: "ROI estimado", v: roi !== null ? `${roi.toFixed(1)}%` : "—", highlight: roi !== null },
  ];

  return (
    <PageShell title="Indicadores" description="Visão consolidada de marketing e comercial.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className={`p-4 ${c.highlight ? "border-emerald-300" : ""} ${c.alert ? "border-amber-300" : ""}`}>
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="text-2xl font-semibold mt-1">{c.v}</div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}