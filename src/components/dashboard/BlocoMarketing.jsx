import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import StatCard from "./StatCard";
import Bloco from "./Bloco";

export default function BlocoMarketing({ mk }) {
  return (
    <Bloco titulo="Marketing e comercial" icone={Megaphone} verMais="/admin/marketing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Campanhas ativas" value={mk.ativasCount} vazio={mk.ativasCount === 0} mensagemVazio="Sem campanhas ativas" />
        <StatCard label="Cupons usados" value={mk.cuponsUsadosCount} />
        <StatCard label="Clientes inativos (90d)" value={mk.inativosCount} tone={mk.inativosCount > 0 ? "alerta" : "default"} />
        <StatCard label="Campanhas vencendo" value={mk.vencendo.length} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Campanhas em andamento</div>
          {mk.ativas.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Sem campanhas registradas no período.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {mk.ativas.map((c) => <li key={c.id} className="truncate">{c.nome}</li>)}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Cupons ativos</div>
          {mk.cuponsAtivos.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nenhum cupom ativo.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {mk.cuponsAtivos.map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.codigo || c.nome}</span><span className="font-mono shrink-0">{c.qtd_usada || 0}x</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </Bloco>
  );
}