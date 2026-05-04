import { Card } from "@/components/ui/card";
import { Boxes, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoOperacoes({ op }) {
  return (
    <Bloco titulo="Operações e estoque" icone={Boxes} verMais="/admin/operacoes">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
        <StatCard label="Itens abaixo do mín." value={op.baixoMin.length} tone={op.baixoMin.length > 0 ? "alerta" : "default"} icon={AlertTriangle} />
        <StatCard label="Inventários pend." value={op.inventariosPend} />
        <StatCard label="Compras pend." value={op.comprasPend} />
        <StatCard label="NFs pendentes" value={op.nfPend} tone={op.nfPend > 0 ? "alerta" : "default"} />
        <StatCard label="OPs abertas" value={op.opAbertas} />
        <StatCard label="Perdas no período" value={op.perdasPeriodo} />
        <StatCard label="Sem ficha técnica" value={op.produtosSemFicha.length} tone={op.produtosSemFicha.length > 0 ? "alerta" : "default"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">10 itens críticos de estoque</div>
          {op.criticos.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhum item abaixo do mínimo.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {op.criticos.map((i) => {
                const ratio = i.estoque_minimo > 0 ? Math.min(1, i.estoque_atual / i.estoque_minimo) : 0;
                return (
                  <li key={i.id}>
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{i.nome}</span>
                      <span className="font-mono shrink-0">{i.estoque_atual} / mín {i.estoque_minimo}</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary mt-0.5">
                      <div className="h-1 rounded-full bg-destructive" style={{ width: `${Math.max(5, ratio * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Notas pendentes</div>
          {op.notasPendentes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma nota pendente.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {op.notasPendentes.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span className="truncate"><Link to="/admin/operacoes/notas-fiscais" className="hover:underline">{n.numero || n.chave_acesso?.slice(-8) || "—"}</Link></span>
                  <span className="font-mono shrink-0">{n.fornecedor_nome || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-xs font-semibold text-muted-foreground mt-3 mb-2">OPs em andamento</div>
          {op.opsAndamento.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhuma OP em andamento.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {op.opsAndamento.map((o) => (
                <li key={o.id} className="truncate">{o.produto_nome || o.descricao || "OP"}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Bloco>
  );
}