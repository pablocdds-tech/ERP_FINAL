import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, Check } from "lucide-react";

/**
 * Link público único de autocadastro facial.
 * O colaborador abre no celular, digita o CPF e tira as 3 fotos sozinho.
 */
export default function LinkCadastroFacial() {
  const [copiado, setCopiado] = useState(false);

  const url = `${window.location.origin}/cadastro-facial`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* */ }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Link de autocadastro facial</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Envie este link aos colaboradores. Cada um digita o próprio CPF e tira as fotos pelo celular.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} className="text-xs h-8" onFocus={(e) => e.target.select()} />
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={copiar}>
          {copiado ? <><Check className="w-3.5 h-3.5 mr-1" /> Copiado</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copiar</>}
        </Button>
      </div>
    </div>
  );
}