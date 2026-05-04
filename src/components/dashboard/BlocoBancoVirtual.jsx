import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

const lojaNome = (lojas, id) => lojas.find((l) => l.id === id)?.nome || "—";

export default function BlocoBancoVirtual({ bv, lojas }) {
  return (
    <Bloco titulo="Banco virtual CD/Lojas" icone={Building2} verMais="/admin/financeiro/virtual/interno-saldos">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Lojas devem ao CD" value={fmtBRL(bv.total)} tone={bv.total > 0 ? "alerta" : "default"} />
        <StatCard label="Liquidações pendentes" value={bv.pendentes} />
        <StatCard label="Débitos da semana" value={fmtBRL(bv.semana)} />
        <StatCard label="Lojas com saldo" value={bv.porLoja.filter((p) => Math.abs(p.saldo) > 0.01).length} hint="Em movimento" />
      </div>
      <Card className="p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Saldo por loja</div>
        {bv.porLoja.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-3">Sem lançamentos internos registrados.</div>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {bv.porLoja.map((p) => (
              <li key={p.loja_id} className="flex justify-between gap-2">
                <span className="truncate">{lojaNome(lojas, p.loja_id)}</span>
                <span className={`font-mono shrink-0 ${p.saldo > 0 ? "text-amber-700" : p.saldo < 0 ? "text-emerald-700" : ""}`}>
                  {p.saldo > 0 ? `deve ${fmtBRL(p.saldo)}` : p.saldo < 0 ? `tem a receber ${fmtBRL(Math.abs(p.saldo))}` : fmtBRL(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-2 text-[10px] text-muted-foreground italic">Banco virtual interno — não é somado ao caixa real nem entra como receita.</p>
    </Bloco>
  );
}