import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Filtros padronizados de loja + período
export default function FiltrosPeriodo({ lojas, lojaId, setLojaId, de, setDe, ate, setAte, mostrarLoja = true }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {mostrarLoja && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Loja</div>
          <Select value={lojaId || "_all"} onValueChange={(v) => setLojaId(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas (consolidado)</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground mb-1">De</div>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Até</div>
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
      </div>
    </div>
  );
}