import { Outlet, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PwaBottomNav from "./PwaBottomNav";

export default function PwaLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen pb-20 bg-background">
        <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              V
            </div>
            <span className="text-sm font-semibold">Vitaliano · Equipe</span>
          </div>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            ERP
          </Link>
        </header>
        <div className="px-4 py-5">
          <Outlet />
        </div>
      </div>
      <PwaBottomNav />
    </div>
  );
}