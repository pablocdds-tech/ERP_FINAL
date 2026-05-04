import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, RotateCcw, Package } from "lucide-react";
import { Link } from "react-router-dom";

export default function ResultadoStep({ resultado, onReiniciar }) {
  const { criados, atualizados, ignorados, erros, saldoInicial, total } = resultado;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Importação concluída</h3>
            <p className="text-sm text-muted-foreground">
              {total} linhas processadas. Resumo abaixo.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Criados" value={criados} tone="emerald" />
        <Stat label="Atualizados" value={atualizados} tone="blue" />
        <Stat label="Ignorados" value={ignorados} tone="muted" />
        <Stat label="Com erro" value={erros} tone="destructive" />
        <Stat label="Saldo inicial" value={saldoInicial} tone="amber" />
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Package className="w-4 h-4" /> Próximos passos
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Itens importados como Insumo: <Link to="/cadastros/insumos" className="text-foreground underline">abrir lista de Insumos</Link></li>
          <li>Itens importados como Produto: <Link to="/cadastros/produtos" className="text-foreground underline">abrir lista de Produtos</Link></li>
          <li>Saldo inicial: <Link to="/admin/operacoes/movimentacoes" className="text-foreground underline">ver movimentações</Link></li>
        </ul>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onReiniciar}>
          <RotateCcw className="w-4 h-4 mr-2" />Importar outra planilha
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${tones[tone] || ""}`}>{value}</div>
    </Card>
  );
}