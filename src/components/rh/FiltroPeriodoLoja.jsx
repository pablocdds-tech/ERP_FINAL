import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Filtro padrão para telas RH: período + loja. Apenas UI controlada. */
export default function FiltroPeriodoLoja({ data_inicio, data_fim, loja_id, lojas, onChange, extras }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Input type="date" value={data_inicio} onChange={(e) => onChange({ data_inicio: e.target.value })} />
          <Input type="date" value={data_fim} onChange={(e) => onChange({ data_fim: e.target.value })} />
        </div>
        <Select value={loja_id || "__all__"} onValueChange={(v) => onChange({ loja_id: v === "__all__" ? "" : v })}>
          <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as lojas</SelectItem>
            {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        {extras}
      </div>
    </Card>
  );
}