import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import PageTitle from "@/components/pwa/PageTitle";
import { usePwa } from "@/lib/PwaContext";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function PwaNotificacoes() {
  const { user } = usePwa() || {};
  const [items, setItems] = useState([]);

  const load = async () => {
    if (!user?.email) return;
    const list = await base44.entities.Notificacao.filter({ destinatario_email: user.email }, "-created_date", 100);
    setItems(list);
  };
  useEffect(() => { load(); }, [user?.email]); // eslint-disable-line

  const marcarLida = async (n) => {
    if (n.lida) return;
    await base44.entities.Notificacao.update(n.id, { lida: true, lida_em: new Date().toISOString() });
    load();
  };

  const marcarTodas = async () => {
    const naoLidas = items.filter((n) => !n.lida);
    for (const n of naoLidas) await base44.entities.Notificacao.update(n.id, { lida: true, lida_em: new Date().toISOString() });
    load();
  };

  return (
    <div>
      <PageTitle title="Notificações"
        action={items.some((n) => !n.lida) && <Button size="sm" variant="outline" onClick={marcarTodas}>Marcar todas</Button>} />
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Sem notificações.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const inner = (
              <Card className={`p-3 ${!n.lida ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2">
                  {!n.lida && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.titulo}</div>
                    {n.mensagem && <div className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_date), "dd/MM HH:mm")}</div>
                  </div>
                </div>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => marcarLida(n)}>{inner}</Link>
            ) : (
              <div key={n.id} onClick={() => marcarLida(n)}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}