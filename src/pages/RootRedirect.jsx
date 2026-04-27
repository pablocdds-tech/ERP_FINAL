import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { defaultLandingPath } from "@/lib/perfil";

// Decide para onde mandar o usuário ao acessar "/".
// Admin/Operador → /admin · Gestor/Funcionário → /app
export default function RootRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setTarget(defaultLandingPath(u)))
      .catch(() => setTarget("/admin")); // sem user, ErpLayout dispara fluxo de login
  }, []);

  if (!target) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}