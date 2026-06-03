import { useState } from "react";
import { crmService, fmtMoeda, DIAS_SEMANA } from "@/lib/crm-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";

const EXEMPLOS = ["calabresa", "ovomaltine", "coca", "frango", "portuguesa"];

export default function BuscaSabor({ onAbrirCliente }) {
  const [termo, setTermo] = useState("");
  const [dia, setDia] = useState("todos");
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);

  const buscar = async (t = termo) => {
    if (!t.trim()) return;
    setLoading(true);
    const diaIdx = dia === "todos" ? "" : Number(dia);
    const d = await crmService.buscaSabor(t.trim(), diaIdx);
    setResultados(d.resultados || []);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por sabor ou produto (ex: calabresa)"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              className="pl-9"
            />
          </div>
          <Select value={dia} onValueChange={setDia}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Dia da semana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer dia</SelectItem>
              {DIAS_SEMANA.map((d) => <SelectItem key={d.idx} value={String(d.idx)}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => buscar()} disabled={loading || !termo.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-muted-foreground self-center">Exemplos:</span>
          {EXEMPLOS.map((ex) => (
            <button key={ex} onClick={() => { setTermo(ex); buscar(ex); }}
              className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {resultados && (
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            {resultados.length} cliente(s) encontrados
            {dia !== "todos" && ` que pedem às ${DIAS_SEMANA[Number(dia)].label.toLowerCase()}s`}
          </div>
          {resultados.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente pediu "{termo}" {dia !== "todos" ? `às ${DIAS_SEMANA[Number(dia)].label.toLowerCase()}s` : ""}.</Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {resultados.map((r) => (
              <Card key={r.phone} className="p-4 hover:border-foreground/30 transition-colors cursor-pointer" onClick={() => onAbrirCliente(r.phone)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}{r.neighborhood ? ` · ${r.neighborhood}` : ""}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Pediu {r.vezes_pediu_termo}×</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                  <span>LTV: <strong className="text-foreground">{fmtMoeda(r.total_gasto)}</strong></span>
                  <span>Pedidos: <strong className="text-foreground">{r.total_pedidos}</strong></span>
                  <span>Ticket: <strong className="text-foreground">{fmtMoeda(r.ticket_medio)}</strong></span>
                  {r.dia_preferido && <span>Dia favorito: <strong className="text-foreground">{r.dia_preferido}</strong></span>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}