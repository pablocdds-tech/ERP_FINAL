import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Store } from "lucide-react";

export default function LojaMultiSelect({ value = [], onChange }) {
  const [lojas, setLojas] = useState([]);
  useEffect(() => {
    base44.entities.Loja.list().then((d) => setLojas(d || []));
  }, []);

  const toggle = (id) => {
    const set = new Set(value || []);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange(Array.from(set));
  };

  const label =
    !value || value.length === 0
      ? "Todas as lojas"
      : `${value.length} loja${value.length > 1 ? "s" : ""} selecionada${value.length > 1 ? "s" : ""}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span className="flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            {label}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="text-xs text-muted-foreground px-2 py-1.5">
          Vazio = todas as lojas
        </div>
        <div className="space-y-1">
          {lojas.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
            >
              <Checkbox
                checked={(value || []).includes(l.id)}
                onCheckedChange={() => toggle(l.id)}
              />
              <span>{l.nome}</span>
              {l.tipo === "cd" && (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  CD
                </Badge>
              )}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}