import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Network } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import { calcularSaldosVirtuais } from "@/lib/financeiro-service";

export default function InternoSaldos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [lojas, setLojas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.LancamentoInterno.list("-data", 5000),
      base44.entities.Loja.list(),
    ]).then(([l, lj]) => { setLancamentos(l); setLojas(lj); });
  }, []);

  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const linhas = useMemo(() => {
    const map = calcularSaldosVirtuais(lancamentos);
    return Array.from(map.values())
      .filter((r) => Math.abs(r.saldo) > 0.001)
      .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  }, [lancamentos]);

  return (
    <PageShell title="Saldos Virtuais" description="Saldo entre as lojas e o CD/origem. Positivo = a loja deve. Negativo = a loja tem crédito.">
      <Card className="p-3 mb-4 bg-blue-50/40 border-blue-200/70">
        <div className="flex items-start gap-2 text-xs text-blue-800">
          <Network className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Estes saldos são <strong>virtuais</strong> — não refletem nenhuma movimentação bancária real.</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Loja</TableHead>
                <TableHead></TableHead>
                <TableHead>Origem (CD/parceiro)</TableHead>
                <TableHead className="text-right">Saldo virtual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">Nenhum saldo aberto entre lojas.</TableCell></TableRow>
              ) : linhas.map((r) => (
                <TableRow key={`${r.loja_a}_${r.loja_b}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{lojaNome(r.loja_a)}</TableCell>
                  <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                  <TableCell>{lojaNome(r.loja_b)}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${r.saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {r.saldo >= 0 ? "deve " : "crédito "}R$ {Math.abs(r.saldo).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}