import { Card } from "@/components/ui/card";
import { Wallet, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "./StatCard";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

const formatDate = (s) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "—";

export default function BlocoFinanceiro({ caixa, contas, movs }) {
  return (
    <Bloco titulo="Financeiro" icone={Wallet} verMais="/admin/financeiro">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Saldo PJ (real)" value={fmtBRL(caixa.pj)} tone={caixa.pj < 0 ? "negativo" : "default"} hint="Caixa + bancos" />
        <StatCard label="PF op. em uso" value={fmtBRL(caixa.pf)} tone={caixa.pf < 0 ? "negativo" : "info"} hint="Conta sócio operacional" />
        <StatCard label="Vencidas" value={fmtBRL(contas.valorVencidasCP)} tone={contas.vencidasCP.length ? "negativo" : "default"} hint={`${contas.vencidasCP.length} conta(s)`} />
        <StatCard label="Fluxo líq. 7d" value={fmtBRL(contas.fluxoLiquido7)} tone={contas.fluxoLiquido7 >= 0 ? "positivo" : "negativo"} hint="Receber - pagar" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Pagar hoje" value={fmtBRL(contas.valorHojeCP)} hint={`${contas.hojeCP.length} conta(s)`} />
        <StatCard label="Pagar 7d" value={fmtBRL(contas.valorProx7CP)} hint={`${contas.prox7CP.length} conta(s)`} />
        <StatCard label="Receber hoje" value={fmtBRL(contas.valorHojeCR)} hint={`${contas.hojeCR.length} conta(s)`} />
        <StatCard label="Receber 7d" value={fmtBRL(contas.valorProx7CR)} hint={`${contas.prox7CR.length} conta(s)`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">Próximas a pagar</div>
            <Link to="/admin/financeiro/real/contas-pagar" className="text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></Link>
          </div>
          {contas.prox7CP.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma conta a pagar nos próximos 7 dias.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {contas.prox7CP.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.descricao || c.fornecedor_nome || "—"}</span>
                  <span className="font-mono shrink-0">{formatDate(c.data_vencimento)} · {fmtBRL(c.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">Principais a receber</div>
            <Link to="/admin/financeiro/real/contas-receber" className="text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></Link>
          </div>
          {contas.prox7CR.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma conta a receber nos próximos 7 dias.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {contas.prox7CR.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.descricao || c.cliente_nome || "—"}</span>
                  <span className="font-mono shrink-0">{formatDate(c.data_vencimento)} · {fmtBRL(c.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">Movimentações recentes</div>
            <Link to="/admin/financeiro/real/movimentacoes" className="text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="w-3 h-3" /></Link>
          </div>
          {(!movs || movs.length === 0) ? (
            <div className="text-xs text-muted-foreground italic py-3">Sem movimentações registradas.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {movs.slice(0, 5).map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <span className="truncate flex items-center gap-1">
                    {m.tipo === "credito" || m.tipo === "transferencia_entrada" ? <span className="text-emerald-600">+</span> : <span className="text-destructive">-</span>}
                    {m.descricao || m.tipo}
                  </span>
                  <span className="font-mono shrink-0">{fmtBRL(m.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Bloco>
  );
}