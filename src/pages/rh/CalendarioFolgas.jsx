import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageShell from "@/components/rh/PageShell";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_CLS = {
  folga: "bg-blue-100 text-blue-800",
  ferias: "bg-purple-100 text-purple-800",
  atestado: "bg-amber-100 text-amber-800",
  feriado: "bg-emerald-100 text-emerald-800",
  outro: "bg-slate-100 text-slate-700",
};

function classificaEscala(e) {
  const t = (e.tipo || "").toLowerCase();
  if (t.includes("folga")) return "folga";
  if (t.includes("ferias") || t.includes("férias")) return "ferias";
  if (t.includes("atestado")) return "atestado";
  if (t === "normal") return null;
  return "outro";
}

export default function CalendarioFolgas() {
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [lojaId, setLojaId] = useState("");
  const [lojas, setLojas] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);

  useEffect(() => { (async () => {
    const [l, c] = await Promise.all([base44.entities.Loja.list(), base44.entities.Colaborador.filter({ status: "ativo" })]);
    setLojas(l || []); setColaboradores(c || []);
  })(); }, []);

  useEffect(() => { (async () => {
    const [a, m] = mes.split("-").map(Number);
    const ini = format(startOfMonth(new Date(a, m - 1, 1)), "yyyy-MM-dd");
    const fim = format(endOfMonth(new Date(a, m - 1, 1)), "yyyy-MM-dd");
    const [e, f] = await Promise.all([
      base44.entities.Escala.list("-data", 5000),
      base44.entities.Feriado.filter({ ativo: true }).catch(() => []),
    ]);
    setEscalas((e || []).filter((x) => x.data >= ini && x.data <= fim));
    setFeriados((f || []).filter((x) => x.data >= ini && x.data <= fim));
  })(); }, [mes]);

  const colMap = useMemo(() => Object.fromEntries(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const [a, m] = mes.split("-").map(Number);
  const dias = eachDayOfInterval({ start: new Date(a, m - 1, 1), end: endOfMonth(new Date(a, m - 1, 1)) });

  const eventosPorDia = useMemo(() => {
    const map = {};
    for (const e of escalas) {
      const cat = classificaEscala(e);
      if (!cat) continue;
      const col = colMap[e.colaborador_id];
      if (!col) continue;
      if (lojaId && col.loja_id !== lojaId) continue;
      (map[e.data] ||= []).push({ tipo: cat, nome: col.nome });
    }
    for (const f of feriados) (map[f.data] ||= []).push({ tipo: "feriado", nome: f.nome });
    return map;
  }, [escalas, feriados, colMap, lojaId]);

  return (
    <PageShell title="Calendário de Folgas" description="Folgas, férias, atestados e feriados no mês.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="md:w-[180px]" />
          <Select value={lojaId || "__all__"} onValueChange={(v) => setLojaId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground mb-1">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="px-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: dias[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
          {dias.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const evs = eventosPorDia[iso] || [];
            return (
              <div key={iso} className="min-h-[88px] border rounded-md p-1.5 bg-card">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">{format(d, "d", { locale: ptBR })}</div>
                <div className="flex flex-col gap-0.5">
                  {evs.slice(0, 3).map((ev, i) => (
                    <Badge key={i} className={`${TIPO_CLS[ev.tipo]} px-1 py-0 text-[10px] font-normal truncate`}>{ev.nome}</Badge>
                  ))}
                  {evs.length > 3 && <span className="text-[10px] text-muted-foreground">+{evs.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}