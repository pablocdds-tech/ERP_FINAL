import { DollarSign, Wallet, Clock, TrendingUp, BarChart3 } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

export default function BlocoExecutivo({ vendas, vendasAnt, caixa, contas, dre }) {
  const delta = vendasAnt?.total > 0 ? ((vendas.total - vendasAnt.total) / vendasAnt.total) * 100 : null;
  return (
    <Bloco titulo="Visão executiva" icone={BarChart3}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Vendas do período"
          value={fmtBRL(vendas.total)}
          delta={delta}
          hint={vendas.qtdFechamentos > 0 ? `${vendas.qtdFechamentos} fechamento(s)` : "Sem fechamentos"}
          vazio={vendas.qtdFechamentos === 0}
          mensagemVazio="Nenhum fechamento no período"
        />
        <StatCard
          icon={Wallet}
          label="Caixa real (PJ)"
          value={fmtBRL(caixa.pj)}
          tone={caixa.pj < 0 ? "negativo" : "default"}
          hint={`PF op.: ${fmtBRL(caixa.pf)}`}
        />
        <StatCard
          icon={Clock}
          label="A pagar 7 dias"
          value={fmtBRL(contas.valorProx7CP + contas.valorVencidasCP)}
          tone={contas.vencidasCP.length > 0 ? "negativo" : "alerta"}
          hint={contas.vencidasCP.length > 0 ? `${contas.vencidasCP.length} vencida(s)` : `${contas.prox7CP.length} conta(s)`}
        />
        <StatCard
          icon={Clock}
          label="A receber 7 dias"
          value={fmtBRL(contas.valorProx7CR + contas.valorVencidasCR)}
          tone="positivo"
          hint={contas.vencidasCR.length > 0 ? `${contas.vencidasCR.length} em atraso` : `${contas.prox7CR.length} conta(s)`}
        />
        <StatCard
          icon={DollarSign}
          label="Resultado gerencial"
          value={fmtBRL(dre.resultado)}
          tone={dre.resultado >= 0 ? "positivo" : "negativo"}
          hint={`Margem: ${dre.margem.toFixed(1)}%`}
        />
      </div>
    </Bloco>
  );
}