import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Bloco({ titulo, descricao, verMais, children, icone: Icon }) {
  return (
    <section className="mb-6">
      <div className="flex items-end justify-between mb-2.5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <h2 className="text-sm font-semibold uppercase tracking-wide truncate">{titulo}</h2>
          {descricao && <span className="text-xs text-muted-foreground hidden sm:inline truncate">— {descricao}</span>}
        </div>
        {verMais && (
          <Link to={verMais} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0">
            ver mais <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}