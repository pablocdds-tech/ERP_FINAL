import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, ShoppingCart, Wallet, Package, FileText } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";

export default function PwaDashboard() {
  const { gestor } = usePwa() || {};
  const [dados, setDados] = useState({
    faturamento_dia: 0, vendas_canais: [], total_caixa: 0,
    estoque_critico: 0, nfs_pendentes: 0,
  });

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.FechamentoDiario.filter({ data: hoje }),
      base44.entities.Insumo.list("", 500).catch(() => []),
      base44.entities.NotaFiscalPendente.filter({ status: "pendente" }),
    ]).then(([fechs, insumos, nfsP]) => {
      const fat = fechs.reduce((s, f) => s + (Number(f.total_vendas) || 0), 0);
      const caixa = fechs.reduce((s, f) => s + (Number(f.total_pagamentos_conferido) || Number(f.total_pagamentos_declarado) || 0), 0);
      const canaisAcc = {};
      fechs.forEach((f) => {
        (f.vendas_por_canal || []).forEach((c) => {
          canaisAcc[c.canal_nome || c.canal_id] = (canaisAcc[c.canal_nome || c.canal_id] || 0) + Number(c.valor || 0);
        });
      });
      const canais = Object.entries(canaisAcc).map(([nome, valor]) => ({ nome, valor }));
      const criticos = insumos.filter((i) => typeof i.estoque_minimo === "number" && typeof i.estoque_atual === "number" && i.estoque_atual < i.estoque_minimo).length;
      setDados({ faturamento_dia: fat, vendas_canais: canais, total_caixa: caixa, estoque_critico: criticos, nfs_pendentes: nfsP.length });
    });
  }, []);

  if (!gestor) {
    return (<div><PageTitle title="Dashboard" /><Card className="p-5 text-sm text-muted-foreground">Acesso restrito a gestores.</Card></div>);
  }

  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Resumo do dia" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <KPI icon={TrendingUp} label="Faturamento" valor={`R$ ${dados.faturamento_dia.toFixed(2)}`} />
        <KPI icon={Wallet} label="Caixa do dia" valor={`R$ ${dados.total_caixa.toFixed(2)}`} />
        <KPI icon={Package} label="Estoque crítico" valor={dados.estoque_critico} cor={dados.estoque_critico > 0 ? "text-destructive" : ""} />
        <KPI icon={FileText} label="NF pendentes" valor={dados.nfs_pendentes} cor={dados.nfs_pendentes > 0 ? "text-amber-700" : ""} />
      </div>

      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vendas por canal (hoje)</div>
      <Card className="p-4">
        {dados.vendas_canais.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">Sem fechamentos hoje.</div>
        ) : (
          <div className="space-y-2">
            {dados.vendas_canais.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />{c.nome}</div>
                <div className="font-mono">R$ {c.valor.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {dados.estoque_critico > 0 && (
        <Card className="p-3 mt-3 bg-destructive/5 border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">{dados.estoque_critico} insumo(s) abaixo do mínimo.</div>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, valor, cor = "" }) {
  return (
    <Card className="p-3">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cor}`}>{valor}</div>
    </Card>
  );
}