import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store } from "lucide-react";

const STORAGE_KEY = "erp.loja.selecionada";

export default function LojaSwitcher() {
  const [lojas, setLojas] = useState([]);
  const [valor, setValor] = useState(() => localStorage.getItem(STORAGE_KEY) || "todas");

  useEffect(() => {
    base44.entities.Loja.list().then((data) => setLojas(data || []));
  }, []);

  const handleChange = (v) => {
    setValor(v);
    localStorage.setItem(STORAGE_KEY, v);
    window.dispatchEvent(new CustomEvent("loja-changed", { detail: v }));
  };

  return (
    <Select value={valor} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[200px] bg-card border-border">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="Selecionar loja" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as lojas</SelectItem>
        {lojas.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}