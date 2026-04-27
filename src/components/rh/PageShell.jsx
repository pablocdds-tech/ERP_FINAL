import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

export default function PageShell({ title, description, actions, children }) {
  return (
    <div>
      <Link to="/pessoas" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-3 h-3 mr-1" /> Pessoas e RH
      </Link>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}