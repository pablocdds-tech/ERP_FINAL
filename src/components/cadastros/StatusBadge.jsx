import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function StatusBadge({ ativo }) {
  const isAtivo = ativo !== false;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal",
        isAtivo
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          isAtivo ? "bg-emerald-500" : "bg-muted-foreground"
        )}
      />
      {isAtivo ? "Ativo" : "Inativo"}
    </Badge>
  );
}