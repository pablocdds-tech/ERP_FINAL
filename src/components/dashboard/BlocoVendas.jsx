import { Card } from "@/components/ui/card";
import { ShoppingBag, Receipt, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import StatCard from "./StatCard";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

const lojaNome = (lojas, id) => lojas.find((l) => l.id === id)?.nome || "—";

export default function BlocoVendas({ vendas, vendasHoje, vendasOntem, lojas, fechamentosPendentes, divergentes }) {
  const semDados = vendas.qtdFechamentos === 0;
  return (
    <Bloco titulo="Vendas e caixa" icone={ShoppingBag} verMais="/admin/vendas/fechamentos">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Vendas hoje" value={fmtBRL(vendasHoje)} vazio={vendasHoje === 0} mensagemVazio="Sem vendas hoje" />
        <StatCard label="Vendas ontem" value={fmtBRL(vendasOntem)} vazio={vendasOntem === 0} mensagemVazio="Sem vendas ontem" />
        <StatCard label="Ticket médio" value={fmtBRL(vendas.ticketMedio)} vazio={vendas.ticketMedio === 0} mensagemVazio="Sem clientes informados" />
        <StatCard label="Fechamentos pendentes" value={fechamentosPendentes} icon={AlertTriangle} tone={fechamentosPendentes > 0 ? "alerta" : "default"} hint={divergentes > 0 ? `${divergentes} caixa(s) divergente(s)` : ""} />
      </div>

      {semDados ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Fechamento de caixa ainda não lançado para o período.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4 lg:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Evolução diária</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={vendas.porDia}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtBRL(v)} />
                <Line type="monotone" dataKey="valor" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Por forma de pagamento</div>
            {vendas.porFormaPagamento.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-6 text-center">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={vendas.porFormaPagamento.slice(0, 6)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Bar dataKey="valor" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-4 lg:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Vendas por loja</div>
            {vendas.porLoja.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-6 text-center">Sem dados</div>
            ) : (
              <div className="space-y-2">
                {vendas.porLoja.map((l) => {
                  const max = vendas.porLoja[0].valor || 1;
                  return (
                    <div key={l.loja_id || "x"}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{lojaNome(lojas, l.loja_id)}</span>
                        <span className="font-mono">{fmtBRL(l.valor)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full bg-foreground" style={{ width: `${(l.valor / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Por canal</div>
            {vendas.porCanal.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-6 text-center">Sem dados</div>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {vendas.porCanal.slice(0, 6).map((c) => (
                  <li key={c.nome} className="flex justify-between gap-2">
                    <span className="truncate">{c.nome}</span>
                    <span className="font-mono shrink-0">{fmtBRL(c.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Bloco>
  );
}