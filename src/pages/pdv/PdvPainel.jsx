import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MonitorSmartphone, Plus } from "lucide-react";
import { toast } from "sonner";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import PdvColuna from "@/components/pdv/PdvColuna";
import { pdvService, PDV_STATUS } from "@/lib/pdv-service";

// Colunas exibidas no painel ao vivo (concluído/cancelado ficam fora do board ativo)
const COLUNAS = PDV_STATUS.filter((s) => ["novo", "em_preparo", "pronto", "em_entrega"].includes(s.value));

export default function PdvPainel() {
  const [pedidos, setPedidos] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const lista = await pdvService.listAtivos(lojaId || undefined);
    setPedidos(lista);
    setLoading(false);
  }, [lojaId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Tempo real: recarrega quando há qualquer mudança nos pedidos
  useEffect(() => {
    const unsub = pdvService.subscribe(() => carregar());
    return () => unsub?.();
  }, [carregar]);

  const avancar = async (pedido) => {
    setBusyId(pedido.id);
    await pdvService.avancar(pedido);
    await carregar();
    setBusyId(null);
  };

  const cancelar = async (pedido) => {
    if (!window.confirm(`Cancelar o pedido #${pedido.numero_pedido || ""}?`)) return;
    setBusyId(pedido.id);
    await pdvService.cancelar(pedido, "Cancelado no painel");
    toast.success("Pedido cancelado.");
    await carregar();
    setBusyId(null);
  };

  const porStatus = (status) => pedidos.filter((p) => p.status === status);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="w-5 h-5" /> Painel de Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">Pedidos ao vivo de todos os canais. {pedidos.length} ativo(s).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-52"><LojaSingleSelect value={lojaId} onChange={setLojaId} emptyLabel="Todas as lojas" /></div>
          <Button asChild variant="outline"><Link to="/admin/pdv/novo"><Plus className="w-4 h-4" /> Novo pedido</Link></Button>
          <Button variant="outline" onClick={carregar} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Badge variant="secondary" className="gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUNAS.map((s) => (
          <PdvColuna
            key={s.value}
            statusInfo={s}
            pedidos={porStatus(s.value)}
            onAvancar={avancar}
            onCancelar={cancelar}
            busyId={busyId}
          />
        ))}
      </div>
    </div>
  );
}