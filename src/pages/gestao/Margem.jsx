import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import PageShell from "@/components/gestao/PageShell";
import { carregarBaseGestao, calcularMargemProdutos } from "@/lib/gestao-service";

export default function Margem() {
  const [base, setBase] = useState(null);
  const [busca, setBusca] = useState("");

  useEffect(() => { carregarBaseGestao().then(setBase); }, []);
  if (!base) return <PageShell title="Margem por Produto"><Card className="p-8 text-center text-sm">Carregando...</Card></PageShell>;

  const margens = calcularMargemProdutos(base).filter((m) => {
    if (!busca) return true;
    return m.produto.nome?.toLowerCase().includes(busca.toLowerCase());
  }).sort((a, b) => b.margemPct - a.margemPct);

  const corMargem = (pct) => pct >= 60 ? "text-emerald-600" : pct >= 40 ? "text-blue-600" : pct >= 20 ? "text-amber-600" : "text-red-600";

  return (
    <PageShell title="Margem por Produto" description="Preço de venda - custo dos insumos da ficha técnica.">
      <div className="relative max-w-sm mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {margens.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Preço venda</TableHead>
                <TableHead>Custo ficha</TableHead>
                <TableHead>Margem (R$)</TableHead>
                <TableHead>Margem (%)</TableHead>
                <TableHead>Status ficha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {margens.map((m) => (
                <TableRow key={m.produto.id}>
                  <TableCell className="font-medium">{m.produto.nome}</TableCell>
                  <TableCell>R$ {m.preco.toFixed(2)}</TableCell>
                  <TableCell>R$ {m.custo.toFixed(2)}</TableCell>
                  <TableCell>R$ {m.margem.toFixed(2)}</TableCell>
                  <TableCell className={`font-semibold ${corMargem(m.margemPct)}`}>{m.margemPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs">
                    {m.temFicha ? <span className="text-emerald-600">Com ficha</span> : <span className="text-muted-foreground">Sem ficha</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}