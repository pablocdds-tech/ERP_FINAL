import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Bloqueia /app se o usuário não estiver autenticado.
export default function AppGuard() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}