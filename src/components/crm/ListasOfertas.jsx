import { useMemo, useState } from "react";
import { fmtMoeda, DIAS_SEMANA } from "@/lib/crm-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, AlertTriangle, CalendarHeart, Repeat } from "lucide-react";

function Secao({ icon: Icon, titulo, descricao, clientes, onAbrirCliente, corItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <div className="font-medium text-sm">{titulo}</div>
        <Badge variant="secondary" className="ml-auto">{clientes.length}</Badge>
      </div>
      <div className="text-xs text-muted-foreground mb-3">{descricao}</div>
      <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
        {clientes.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Nenhum cliente nesta lista.</div>}
        {clientes.map((c) => (
          <button key={c.phone} onClick={() => onAbrirCliente(c.phone)}
            className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {c.sabores_favoritos[0]?.nome ? `Gosta de ${c.sabores_favoritos[0].nome}` : c.phone}
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{corItem(c)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function ListasOfertas({ clientes, onAbrirCliente }) {
  const [diaAlvo, setDiaAlvo] = useState("1"); // Segunda por padrão

  const vips = useMemo(() => [...clientes].sort((a, b) => b.total_gasto - a.total_gasto).slice(0, 15), [clientes]);
  const sumidos = useMemo(() => clientes.filter((c) => c.dias_sem_pedir >= 30 && c.pedidos >= 2).sort((a, b) => a.dias_sem_pedir - b.dias_sem_pedir), [clientes]);
  const recorrentes = useMemo(() => clientes.filter((c) => c.pedidos >= 3).sort((a, b) => (a.freq_media_dias || 999) - (b.freq_media_dias || 999)), [clientes]);
  const doDia = useMemo(() => clientes.filter((c) => c.dia_preferido_idx === Number(diaAlvo)).sort((a, b) => b.total_gasto - a.total_gasto), [clientes, diaAlvo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Secao
        icon={Crown} titulo="Clientes VIP (maior LTV)"
        descricao="Seus melhores clientes por total gasto. Ofereça benefícios exclusivos."
        clientes={vips} onAbrirCliente={onAbrirCliente}
        corItem={(c) => fmtMoeda(c.total_gasto)}
      />

      <Secao
        icon={AlertTriangle} titulo="Sumidos (30+ dias sem pedir)"
        descricao="Já pediram antes mas pararam. Reative com uma promoção do que eles gostam."
        clientes={sumidos} onAbrirCliente={onAbrirCliente}
        corItem={(c) => `${c.dias_sem_pedir}d`}
      />

      <Secao
        icon={Repeat} titulo="Recorrentes (3+ pedidos)"
        descricao="Clientes fiéis com padrão de compra. Crie um programa de fidelidade."
        clientes={recorrentes} onAbrirCliente={onAbrirCliente}
        corItem={(c) => c.freq_media_dias ? `a cada ${c.freq_media_dias}d` : `${c.pedidos} pedidos`}
      />

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarHeart className="w-4 h-4 text-primary" />
          <div className="font-medium text-sm">Clientes que pedem em um dia</div>
          <div className="ml-auto">
            <Select value={diaAlvo} onValueChange={setDiaAlvo}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIAS_SEMANA.map((d) => <SelectItem key={d.idx} value={String(d.idx)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Clientes cujo dia preferido é {DIAS_SEMANA[Number(diaAlvo)].label.toLowerCase()}. Oferte o sabor favorito deles nesse dia.
        </div>
        <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
          {doDia.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Nenhum cliente nesta lista.</div>}
          {doDia.map((c) => (
            <button key={c.phone} onClick={() => onAbrirCliente(c.phone)}
              className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {c.sabores_favoritos[0]?.nome ? `Oferte: ${c.sabores_favoritos[0].nome}` : c.phone}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{fmtMoeda(c.total_gasto)}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}