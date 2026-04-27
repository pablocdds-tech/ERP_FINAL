import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getColaboradorAtual, isGestor as checkGestor } from "./rh-service";

const PwaCtx = createContext(null);

export function PwaProvider({ children }) {
  const [user, setUser] = useState(null);
  const [colaborador, setColaborador] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const c = await getColaboradorAtual();
      setColaborador(c);
    } catch {
      setUser(null); setColaborador(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const gestor = checkGestor(user, colaborador);

  return (
    <PwaCtx.Provider value={{ user, colaborador, gestor, loading, reload }}>
      {children}
    </PwaCtx.Provider>
  );
}

export const usePwa = () => useContext(PwaCtx);