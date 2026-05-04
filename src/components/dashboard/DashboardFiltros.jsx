import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERIODOS = [
  { v: "hoje", l: "Hoje" },
  { v: "ontem", l: "Ontem" },
  { v: "7dias", l: "Últimos 7 dias" },
  { v: "mes_atual", l: "Mês atual" },
  { v: "mes_anterior", l: "Mês anterior" },
  { v: "personalizado", l: "Personalizado" },
];

export default function DashboardFiltros({ lojas, lojaId, onLojaChange, periodo, onPeriodoChange, custom, onCustomChange, visao, onVisaoChange }) {
  return (
    <Card className="p-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Loja</Label>
          <Select value={lojaId || "todas"} onValueChange={(v) => onLojaChange(v === "todas" ? null : v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas / consolidado</SelectItem>
              {lojas.filter((l) => l.ativo !== false).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Período</Label>
          <Select value={periodo} onValueChange={onPeriodoChange}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Visão</Label>
          <Select value={visao} onValueChange={onVisaoChange}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="consolidado">Consolidado</SelectItem>
              <SelectItem value="por_loja">Por loja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "personalizado" && (
          <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">De</Label>
              <Input type="date" className="h-9 mt-1" value={custom?.de || ""} onChange={(e) => onCustomChange({ ...custom, de: e.target.value })} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Até</Label>
              <Input type="date" className="h-9 mt-1" value={custom?.ate || ""} onChange={(e) => onCustomChange({ ...custom, ate: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}