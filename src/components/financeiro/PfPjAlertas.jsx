import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const fmt = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function PfPjAlertas({ contas, movimentos, semana, limiteSemanaRetirada = 2000 }) {
  const alertas = [];

  // 1. Cheque especial PF em uso (saldo negativo em conta cheque_especial_pf)
  for (const c of contas.filter((x) => x.tipo_conta === "cheque_especial_pf" || x.tipo === "cheque_especial_pf")) {
    const saldo = c._saldo ?? 0;
    if (saldo < 0) {
      alertas.push({
        sev: "alta",
        titulo: `Cheque especial PF em uso: ${c.nome}`,
        detalhe: `Saldo atual ${fmt(saldo)}. Limite ${fmt(c.limite_credito || c.limite || 0)}.`,
      });
    }
  }

  // 2. Retirada do sócio acima do limite semanal
  if ((semana?.retiradas || 0) > limiteSemanaRetirada) {
    alertas.push({
      sev: "media",
      titulo: "Retirada do sócio acima do limite semanal",
      detalhe: `Retirado ${fmt(semana.retiradas)} (limite ${fmt(limiteSemanaRetirada)}).`,
    });
  }

  // 3. Venda recebida em PF não devolvida
  const totalRecebidoPf = movimentos
    .filter((m) => m.tipo_movimento === "recebimento_empresa_em_pf" && m.status !== "cancelado")
    .reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const totalDevolvido = movimentos
    .filter((m) => m.tipo_movimento === "devolucao_socio_empresa" && m.status !== "cancelado")
    .reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const naoTransferido = totalRecebidoPf - totalDevolvido;
  if (naoTransferido > 0) {
    alertas.push({
      sev: "media",
      titulo: "Vendas em PF ainda não transferidas para PJ",
      detalhe: `Saldo pendente de transferência: ${fmt(naoTransferido)}.`,
    });
  }

  // 4. Despesas pessoais lançadas como operacional na semana
  if ((semana?.despesas_pessoais_pela_empresa || 0) > 0) {
    alertas.push({
      sev: "info",
      titulo: "Despesa pessoal paga pela empresa registrada",
      detalhe: `${fmt(semana.despesas_pessoais_pela_empresa)} essa semana — não entra na DRE operacional.`,
    });
  }

  if (alertas.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Nenhum alerta no momento.
      </Card>
    );
  }

  const toneOf = (sev) => sev === "alta" ? "rose" : sev === "media" ? "amber" : "blue";
  const IconOf = (sev) => sev === "alta" ? AlertTriangle : sev === "media" ? AlertCircle : Info;

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => {
        const tone = toneOf(a.sev);
        const Icon = IconOf(a.sev);
        return (
          <Card key={i} className={`p-3 border-${tone}-200 bg-${tone}-50/40`}>
            <div className={`flex gap-2 text-${tone}-800 text-sm`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">{a.titulo}</div>
                <div className="text-xs">{a.detalhe}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}