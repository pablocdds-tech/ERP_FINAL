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
      .catch(() => {
        // Sem usuário: dispara o fluxo de login do Base44 e fica aqui
        // (NÃO redirecione para /admin — AdminGuard manda de volta para "/" e cria loop)
        base44.auth.redirectToLogin(window.location.origin + "/");
      });
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