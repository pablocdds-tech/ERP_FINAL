import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tablet, CheckCircle2, XCircle, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { autorizarDispositivo, revogarDispositivo } from "@/lib/kiosk-device-service";
import PageHeader from "@/components/common/PageHeader";
import { format } from "date-fns";

export default function KioskDispositivos() {
  const [devices, setDevices] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const [d, l, u] = await Promise.all([
      base44.entities.KioskDevice.list("-created_date", 200),
      base44.entities.Loja.filter({ ativo: true }),
      base44.auth.me().catch(() => null),
    ]);
    setDevices(d);
    setLojas(l);
    setUser(u);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const lojaNome = (id) => lojas.find((x) => x.id === id)?.nome || "—";

  const aprovar = async (d) => {
    await autorizarDispositivo(d.id, user?.email);
    carregar();
  };
  const revogar = async (d) => {
    if (!confirm(`Revogar acesso do tablet "${d.nome_dispositivo || d.device_id}"?`)) return;
    await revogarDispositivo(d.id);
    carregar();
  };

  const pendentes = devices.filter((d) => !d.autorizado);
  const ativos = devices.filter((d) => d.autorizado && d.ativo);
  const revogados = devices.filter((d) => d.autorizado === false && d.ativo === false);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tablets de Ponto (Kiosk)"
        description="Aprove e gerencie os tablets fixos de cada loja."
        actions={
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="w-4 h-4 mr-2" />Atualizar
          </Button>
        }
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <Secao titulo="Aguardando aprovação" cor="amber" itens={pendentes} vazio="Nenhum tablet aguardando aprovação.">
            {(d) => (
              <Linha d={d} lojaNome={lojaNome(d.loja_id)} acoes={
                <Button size="sm" onClick={() => aprovar(d)}>
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> Aprovar
                </Button>
              } />
            )}
          </Secao>

          <Secao titulo="Tablets ativos" cor="emerald" itens={ativos} vazio="Nenhum tablet ativo.">
            {(d) => (
              <Linha d={d} lojaNome={lojaNome(d.loja_id)} acoes={
                <Button size="sm" variant="outline" onClick={() => revogar(d)}>
                  <ShieldOff className="w-4 h-4 mr-1.5" /> Revogar
                </Button>
              } />
            )}
          </Secao>

          {revogados.length > 0 && (
            <Secao titulo="Revogados" cor="slate" itens={revogados}>
              {(d) => (
                <Linha d={d} lojaNome={lojaNome(d.loja_id)} acoes={
                  <Button size="sm" variant="outline" onClick={() => aprovar(d)}>
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Reativar
                  </Button>
                } />
              )}
            </Secao>
          )}
        </>
      )}
    </div>
  );
}

function Secao({ titulo, cor, itens, vazio, children }) {
  if (!itens.length && !vazio) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <Badge variant="outline" className="text-[10px]">{itens.length}</Badge>
      </div>
      {itens.length === 0 ? (
        <div className="text-xs text-muted-foreground border border-dashed rounded-lg p-4">{vazio}</div>
      ) : (
        <div className="space-y-2">{itens.map((d) => <div key={d.id}>{children(d)}</div>)}</div>
      )}
    </div>
  );
}

function Linha({ d, lojaNome, acoes }) {
  const ultimoAcesso = d.ultimo_acesso_em ? format(new Date(d.ultimo_acesso_em), "dd/MM/yyyy HH:mm") : "nunca";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Tablet className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{d.nome_dispositivo || "Tablet sem nome"}</span>
            {d.autorizado && d.ativo && (
              <Badge variant="default" className="text-[10px] bg-emerald-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />Ativo
              </Badge>
            )}
            {!d.autorizado && (
              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                Pendente
              </Badge>
            )}
            {d.autorizado === false && d.ativo === false && (
              <Badge variant="outline" className="text-[10px]">
                <XCircle className="w-3 h-3 mr-1" />Revogado
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {lojaNome} · Último acesso: {ultimoAcesso}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
            {d.device_id}
          </div>
        </div>
        <div className="shrink-0">{acoes}</div>
      </CardContent>
    </Card>
  );
}