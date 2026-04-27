import { Card } from "@/components/ui/card";

// Página genérica do PWA — usada para Ponto, Escala, Checklist e Chamados
// enquanto a implementação real é construída de forma incremental.
export default function PwaSimplePage({ titulo, descricao, icon: Icon, itens = [] }) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">{titulo}</h1>
          {descricao && <p className="text-xs text-muted-foreground mt-1">{descricao}</p>}
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((item) => (
          <Card key={item} className="p-4 flex items-center justify-between">
            <span className="text-sm">{item}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Em breve
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}