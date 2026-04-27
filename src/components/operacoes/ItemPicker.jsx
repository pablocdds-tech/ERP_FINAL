import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Picker unificado de Insumo ou Produto.
// Props:
// - tipo: "insumo" | "produto" | "ambos"
// - value: { item_tipo, item_id, item_nome }
// - onChange(value)
export default function ItemPicker({ tipo = "ambos", value, onChange, placeholder = "Selecione um item" }) {
  const [insumos, setInsumos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    if (tipo === "insumo" || tipo === "ambos") base44.entities.Insumo.list().then(setInsumos);
    if (tipo === "produto" || tipo === "ambos") base44.entities.Produto.list().then(setProdutos);
  }, [tipo]);

  const opcoes = useMemo(() => {
    const a = (tipo === "produto" ? [] : insumos).map((i) => ({ id: i.id, nome: i.nome, item_tipo: "insumo" }));
    const b = (tipo === "insumo" ? [] : produtos).map((p) => ({ id: p.id, nome: p.nome, item_tipo: "produto" }));
    const all = [...a, ...b];
    if (!filtro) return all;
    return all.filter((o) => o.nome.toLowerCase().includes(filtro.toLowerCase()));
  }, [insumos, produtos, tipo, filtro]);

  const handleChange = (id) => {
    const op = opcoes.find((o) => o.id === id);
    if (op) onChange({ item_tipo: op.item_tipo, item_id: op.id, item_nome: op.nome });
  };

  return (
    <Select value={value?.item_id || ""} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <Input
            placeholder="Buscar..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {opcoes.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum item</div>
        )}
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{o.item_tipo}</span>
              <span>{o.nome}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}