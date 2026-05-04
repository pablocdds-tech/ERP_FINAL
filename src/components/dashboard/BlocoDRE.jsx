import { Card } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

const Linha = ({ label, valor, tone = "default", strong = false, indent = false }) => {
  const toneCls = { positivo: "text-emerald-700", negativo: "text-destructive", default: "" }[tone];
  return (
    <div className={`flex justify-between text-sm py-1.5 border-b last:border-b-0 ${indent ? "pl-4 text-muted-foreground" : ""} ${strong ? "font-semibold bg-muted/30 px-2 -mx-2 rounded" : ""}`}>
      <span>{label}</span>
      <span className={`font-mono tabular-nums ${toneCls}`}>{fmtBRL(valor)}</span>
    </div>
  );
};

export default function BlocoDRE({ dre }) {
  if (!dre || dre.receitaBruta === 0) {
    return (
      <Bloco titulo="DRE gerencial resumida" icone={FileBarChart} verMais="/admin/gestao/dre">
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma receita reconhecida no período.
        </Card>
      </Bloco>
    );
  }
  return (
    <Bloco titulo="DRE gerencial resumida" icone={FileBarChart} verMais="/admin/gestao/dre">
      <Card className="p-4">
        <Linha label="Receita Bruta" valor={dre.receitaBruta} strong />
        <Linha label="Deduções da Receita" valor={-dre.deducoes} indent tone="negativo" />
        <Linha label="Receita Líquida" valor={dre.receitaLiquida} strong />
        <Linha label="CMV" valor={-dre.cmv} indent tone="negativo" />
        <Linha label="Lucro Bruto" valor={dre.lucroBruto} strong tone={dre.lucroBruto >= 0 ? "positivo" : "negativo"} />
        <Linha label="Mão de Obra" valor={-dre.mo} indent tone="negativo" />
        <Linha label="Despesas Operacionais" valor={-dre.desOp} indent tone="negativo" />
        <Linha label="Marketing e Comercial" valor={-dre.mkt} indent tone="negativo" />
        <Linha label="Delivery e Logística" valor={-dre.delivery} indent tone="negativo" />
        <Linha label="Despesas Administrativas" valor={-dre.adm} indent tone="negativo" />
        <Linha label="Despesas Financeiras" valor={-dre.fin} indent tone="negativo" />
        <Linha label="Impostos e Taxas" valor={-dre.imp} indent tone="negativo" />
        <Linha label="Resultado Gerencial" valor={dre.resultado} strong tone={dre.resultado >= 0 ? "positivo" : "negativo"} />
        {dre.inv > 0 && <Linha label="Investimentos (separado)" valor={dre.inv} indent />}
        <div className="mt-2 text-[11px] text-muted-foreground">
          Margem: <strong className={dre.resultado >= 0 ? "text-emerald-700" : "text-destructive"}>{dre.margem.toFixed(1)}%</strong> · Aportes/retiradas/transferências internas excluídas. Banco virtual não infla receita.
        </div>
      </Card>
    </Bloco>
  );
}