import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageShell from "@/components/vendas/PageShell";
import FechamentoStatusBadge from "@/components/vendas/FechamentoStatusBadge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Calendario() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [refDate, setRefDate] = useState(new Date());

  useEffect(() => {
    Promise.all([
      base44.entities.FechamentoDiario.list("-data", 500),
      base44.entities.Loja.list(),
    ]).then(([f, l]) => { setItems(f); setLojas(l); });
  }, []);

  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) }), [refDate]);

  const fechamentosPorDia = useMemo(() => {
    const map = new Map();
    for (const f of items) {
      if (lojaFilter !== "todas" && f.loja_id !== lojaFilter) continue;
      const key = f.data;
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    }
    return map;
  }, [items, lojaFilter]);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  return (
    <PageShell title="Calendário de vendas" description="Visão por loja e por dia. Clique para abrir o fechamento.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-full md:w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setRefDate((d) => addMonths(d, -1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium w-40 text-center capitalize">
              {format(refDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="outline" size="icon" onClick={() => setRefDate((d) => addMonths(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
        {dias.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const lista = fechamentosPorDia.get(key) || [];
          const totalDia = lista.reduce((s, f) => s + (Number(f.total_vendas) || 0), 0);
          return (
            <Card key={key} className="p-3 min-h-[110px]">
              <div className="text-xs text-muted-foreground">{format(d, "EEE dd", { locale: ptBR })}</div>
              {lista.length === 0 ? (
                <div className="text-[11px] text-muted-foreground mt-2">Sem fechamento</div>
              ) : (
                <>
                  <div className="text-sm font-semibold font-mono mt-1">R$ {totalDia.toFixed(2)}</div>
                  <div className="space-y-1 mt-2">
                    {lista.slice(0, 3).map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="truncate flex-1 text-muted-foreground">{lojaNome(f.loja_id)}</span>
                        <FechamentoStatusBadge status={f.status} />
                      </div>
                    ))}
                    {lista.length > 3 && <div className="text-[10px] text-muted-foreground">+{lista.length - 3}</div>}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}