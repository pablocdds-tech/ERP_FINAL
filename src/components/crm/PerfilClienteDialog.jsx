import { useEffect, useState } from "react";
import { crmService, fmtMoeda, fmtData } from "@/lib/crm-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DiasSemanaBar from "./DiasSemanaBar";
import { Phone, MapPin, TrendingUp, Repeat, CalendarDays, Clock, Pizza } from "lucide-react";

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export default function PerfilClienteDialog({ phone, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phone && open) {
      setLoading(true);
      crmService.perfil(phone).then((d) => setData(d)).finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [phone, open]);

  const c = data?.cliente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {c?.name || "Cliente"}
            {c?.dia_preferido && <Badge variant="secondary">Pede mais: {c.dia_preferido}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading && <div className="py-10 text-center text-sm text-muted-foreground">Carregando jornada do cliente...</div>}

        {!loading && c && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone}</span>
              {c.neighborhood && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.neighborhood}</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat icon={TrendingUp} label="LTV (total gasto)" value={fmtMoeda(c.total_gasto)} />
              <Stat icon={Pizza} label="Pedidos" value={c.pedidos} hint={`Ticket médio ${fmtMoeda(c.ticket_medio)}`} />
              <Stat icon={Repeat} label="Frequência" value={c.freq_media_dias ? `${c.freq_media_dias}d` : "—"} hint={c.freq_media_dias ? "entre pedidos" : "1 pedido só"} />
              <Stat icon={Clock} label="Sem pedir há" value={`${c.dias_sem_pedir}d`} hint={`Último: ${fmtData(c.ultimo_pedido) || "—"}`} />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />Dias que mais pede</div>
                <DiasSemanaBar distribuicao={c.distribuicao_dias} destaqueIdx={c.dia_preferido_idx} />
              </div>
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-1.5"><Pizza className="w-4 h-4" />Sabores / produtos favoritos</div>
                <div className="flex flex-wrap gap-1.5">
                  {c.sabores_favoritos.length === 0 && <span className="text-xs text-muted-foreground">Sem dados.</span>}
                  {c.sabores_favoritos.map((s) => (
                    <Badge key={s.nome} variant="outline" className="font-normal">
                      {s.nome} <span className="ml-1 text-muted-foreground">×{s.qtd}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Histórico de pedidos ({data.historico?.length || 0})</div>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {(data.historico || []).map((h, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{fmtData(h.when) || "—"} · {h.dia}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal">{h.canal}</Badge>
                        <strong>{fmtMoeda(h.total)}</strong>
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                      {h.itens.map((it, j) => (
                        <div key={j}>
                          {it.qtd > 1 ? `${it.qtd}× ` : ""}{it.nome}
                          {it.tokens && it.tokens.length > 0 && (
                            <span className="text-foreground/70"> — {it.tokens.filter((t) => t !== it.nome).join(", ")}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !c && <div className="py-10 text-center text-sm text-muted-foreground">Cliente não encontrado.</div>}
      </DialogContent>
    </Dialog>
  );
}