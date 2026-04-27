import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LojaSingleSelect({ value, onChange, allowEmpty = true, emptyLabel = "— Sem vínculo —" }) {
  const [lojas, setLojas] = useState([]);
  useEffect(() => {
    base44.entities.Loja.list().then((d) => setLojas(d || []));
  }, []);

  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none__">{emptyLabel}</SelectItem>}
        {lojas.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}