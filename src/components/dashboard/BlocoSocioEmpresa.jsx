import { Card } from "@/components/ui/card";
import { UserCog, AlertTriangle } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";
import { fmtBRL } from "@/lib/dashboard-service";

export default function BlocoSocioEmpresa({ se, caixa }) {
  const alertas = [];
  if (caixa.chequeEspecialPF > 0) alertas.push(`Cheque especial PF em uso: ${fmtBRL(caixa.chequeEspecialPF)}`);
  if (se.recebidoEmPF > 0) alertas.push(`Vendas recebidas em PF não transferidas: ${fmtBRL(se.recebidoEmPF)}`);

  return (
    <Bloco titulo="Sócio x Empresa" icone={UserCog} verMais="/admin/financeiro/socio-empresa/dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        <StatCard label="Empresa deve ao sócio" value={fmtBRL(se.empresaDeveSocio)} tone="alerta" />
        <StatCard label="Sócio deve à empresa" value={fmtBRL(se.socioDeveEmpresa)} tone="info" />
        <StatCard label="Saldo líquido" value={fmtBRL(se.saldoLiquido)} tone={se.saldoLiquido >= 0 ? "positivo" : "negativo"} hint={se.saldoLiquido >= 0 ? "Empresa deve" : "Sócio deve"} />
        <StatCard label="Retiradas no período" value={fmtBRL(se.retiradasMes)} />
        <StatCard label="Cheque esp. PF" value={fmtBRL(caixa.chequeEspecialPF)} tone={caixa.chequeEspecialPF > 0 ? "negativo" : "default"} />
        <StatCard label="Recebido em PF" value={fmtBRL(se.recebidoEmPF)} tone={se.recebidoEmPF > 0 ? "alerta" : "default"} hint="Vendas em conta sócio" />
      </div>
      {alertas.length > 0 && (
        <Card className="p-3 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-2 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Alertas Sócio x Empresa</div>
              <ul className="list-disc ml-4 space-y-0.5">
                {alertas.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </Bloco>
  );
}