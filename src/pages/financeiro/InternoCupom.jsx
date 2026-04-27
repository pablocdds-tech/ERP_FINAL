import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Printer } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import { format } from "date-fns";

const TIPO_LABEL = { debito: "Débito", credito: "Crédito", liquidacao: "Liquidação" };

export default function InternoCupom() {
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [search, setSearch] = useState("");
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.LancamentoInterno.list("-data", 200),
      base44.entities.Loja.list(),
    ]).then(([l, lj]) => { setItems(l); setLojas(lj); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtered = useMemo(() => items.filter((l) =>
    !search || `${l.cupom_numero || ""} ${l.descricao || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  return (
    <PageShell title="Cupons de Conferência" description="Cupom impresso de cada lançamento interno. Para conferência manual entre CD e loja.">
      <Card className="p-4 mb-4">
        <div className="flex gap-3">
          <Input placeholder="Buscar por cupom ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
          <Select value={selecionado?.id || ""} onValueChange={(v) => setSelecionado(items.find((i) => i.id === v) || null)}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione um lançamento" /></SelectTrigger>
            <SelectContent>
              {filtered.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.cupom_numero || l.id.slice(0, 8)} — R$ {Number(l.valor || 0).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {selecionado ? (
        <Card className="p-8 max-w-md mx-auto" id="cupom-print">
          <div className="text-center border-b border-dashed border-border pb-3 mb-3">
            <Receipt className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-bold tracking-wider">CUPOM DE CONFERÊNCIA INTERNA</div>
            <div className="text-[10px] text-muted-foreground">Não é documento fiscal — apenas controle interno</div>
          </div>

          <div className="space-y-2 text-sm font-mono">
            <Linha k="Cupom" v={selecionado.cupom_numero || selecionado.id.slice(0, 8)} />
            <Linha k="Data" v={format(new Date(selecionado.data), "dd/MM/yyyy")} />
            <Linha k="Tipo" v={TIPO_LABEL[selecionado.tipo]} />
            <Linha k="De" v={lojaNome(selecionado.loja_origem_id)} />
            <Linha k="Para" v={lojaNome(selecionado.loja_destino_id)} />
            {selecionado.categoria && <Linha k="Categoria" v={selecionado.categoria} />}
            <div className="border-t border-dashed border-border pt-3 mt-3">
              <Linha k="VALOR" v={`R$ ${Number(selecionado.valor || 0).toFixed(2)}`} bold />
            </div>
            {selecionado.descricao && (
              <div className="text-xs pt-2 border-t border-dashed border-border mt-3">
                <div className="text-muted-foreground mb-1">Descrição:</div>
                <div>{selecionado.descricao}</div>
              </div>
            )}
            <div className="text-xs pt-2 border-t border-dashed border-border mt-3">
              <div>Status: {selecionado.status}</div>
              {selecionado.usuario_email && <div className="text-muted-foreground">Por: {selecionado.usuario_email}</div>}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-dashed border-border">
              <div className="text-center">
                <div className="border-t border-foreground/40 pt-1 text-[10px] uppercase">Origem</div>
              </div>
              <div className="text-center">
                <div className="border-t border-foreground/40 pt-1 text-[10px] uppercase">Destino</div>
              </div>
            </div>
          </div>

          <div className="mt-4 print:hidden flex justify-center">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Imprimir
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Selecione um lançamento acima para visualizar e imprimir o cupom.
        </Card>
      )}
    </PageShell>
  );
}

function Linha({ k, v, bold }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "text-base font-bold" : ""}`}>
      <span className="text-muted-foreground">{k}:</span>
      <span className="text-right">{v}</span>
    </div>
  );
}