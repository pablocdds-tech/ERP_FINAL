import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

// Shell padrão das telas internas do módulo Operações.
export default function PageShell({ title, description, actions, children }) {
  return (
    <div>
      <Link to="/operacoes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="w-3 h-3" />
        Voltar para Operações
      </Link>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}