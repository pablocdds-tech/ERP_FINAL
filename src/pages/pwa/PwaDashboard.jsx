import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Wallet, Package, FileText, Users, AlertTriangle } from "lucide-react";
import { usePwa } from "@/lib/PwaContext";
import { format } from "date-fns";

export default function PwaDashboard() {
  const { gestor, colaborador } = usePwa() || {};
  const [data, setData] = useState({
    fatHoje: 0, vendasCanal: [], caixaHoje: 0,
    estoqueCritico: 0, nfPendentes: 0, equipeHoje: 0,
  });

  useEffect(() => {
    if (!gestor) return;
    const hoje = new Date().toISOString().slice(0, 10);
    Promise.all([
      base44.entities.FechamentoDiario.filter({ data: hoje }),
      base44.entities.NotaFiscalPendente.filter({ status: "pendente" }),
      base44.entities.Insumo.list().catch(() => []),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.Escala.filter({ data: hoje }),
    ]).then(([fech, nfs, insumos, cols, escs]) => {
      const lojaId = colaborador?.loja_id;
      const fechFiltrado = lojaId ? fech.filter((f) => f.loja_id === lojaId) : fech;
      const fatHoje = fechFiltrado.reduce((s, f) => s + (f.total_vendas || 0), 0);
      const canaisMap = {};
      fechFiltrado.forEach((f) => (f.vendas_por_canal || []).forEach((c) => {
        canaisMap[c.canal_nome || "—"] = (canaisMap[c.canal_nome || "—"] || 0) + (c.valor || 0);
      }));
      const vendasCanal = Object.entries(canaisMap).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
      const caixaHoje = fechFiltrado.reduce((s, f) => {
        const dinheiro = (f.vendas_por_pagamento || []).find((p) => p.forma_tipo === "dinheiro");
        return s + (dinheiro?.valor_conferido || dinheiro?.valor_declarado || 0);
      }, 0);
      const estoqueCritico = insumos.filter((i) => i.estoque_minimo && (i.quantidade || 0) <= i.estoque_minimo).length;
      const escalados = escs.filter((e) => e.tipo === "normal" && (!lojaId || cols.find((c) => c.id === e.colaborador_id)?.loja_id === lojaId)).length;
      setData({
        fatHoje, vendasCanal, caixaHoje, estoqueCritico,
        nfPendentes: nfs.length, equipeHoje: escalados,
      });
    });
  }, [gestor, colaborador?.loja_id]);

  if (!gestor) return <div className="text-center py-10 text-sm text-muted-foreground">Acesso restrito.</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Dashboard</h1>
      <p className="text-xs text-muted-foreground mb-4">{format(new Date(), "EEEE, dd/MM/yyyy")}</p>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Tile icon={TrendingUp} label="Faturamento hoje" valor={`R$ ${data.fatHoje.toFixed(2)}`} cor="text-emerald-600" />
        <Tile icon={Wallet} label="Caixa (dinheiro)" valor={`R$ ${data.caixaHoje.toFixed(2)}`} />
        <Tile icon={Users} label="Equipe escalada" valor={data.equipeHoje} />
        <Tile icon={Package} label="Estoque crítico" valor={data.estoqueCritico} cor={data.estoqueCritico > 0 ? "text-amber-600" : ""} />
        <Tile icon={FileText} label="NFs pendentes" valor={data.nfPendentes} cor={data.nfPendentes > 0 ? "text-amber-600" : ""} />
        <Tile icon={AlertTriangle} label="Alertas" valor={data.estoqueCritico + data.nfPendentes} cor="text-destructive" />
      </div>

      {data.vendasCanal.length > 0 && (
        <>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vendas por canal</div>
          <Card className="p-4 space-y-2">
            {data.vendasCanal.map((c) => (
              <div key={c.nome} className="flex items-center justify-between text-sm">
                <span>{c.nome}</span>
                <span className="font-mono">R$ {c.valor.toFixed(2)}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, valor, cor }) {
  return (
    <Card className="p-3">
      <Icon className={`w-4 h-4 mb-2 text-muted-foreground ${cor || ""}`} />
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${cor || ""}`}>{valor}</div>
    </Card>
  );
}