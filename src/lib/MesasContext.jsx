import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { mesasService } from "@/lib/mesas-service";

// Contexto do PWA de Mesas: usuário logado, loja ativa, garçom selecionado
// (persistido no dispositivo) e config da loja.
const MesasContext = createContext(null);

const GARCOM_KEY = "mesas.garcom.ativo";
const LOJA_KEY = "mesas.loja.ativa";

export function MesasProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [lojas, setLojas] = useState([]);
  const [lojaId, setLojaId] = useState(() => localStorage.getItem(LOJA_KEY) || "");
  const [garcom, setGarcomState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(GARCOM_KEY) || "null"); } catch { return null; }
  });
  const [config, setConfig] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    base44.entities.Loja.filter({ ativo: true }, "nome", 100).then((l) => {
      setLojas(l || []);
      // Auto-seleciona a primeira loja se nenhuma estiver salva
      if (!localStorage.getItem(LOJA_KEY) && l && l[0]) {
        setLojaId(l[0].id);
        localStorage.setItem(LOJA_KEY, l[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (lojaId) mesasService.getConfig(lojaId).then(setConfig);
  }, [lojaId]);

  const setGarcom = useCallback((g) => {
    setGarcomState(g);
    if (g) localStorage.setItem(GARCOM_KEY, JSON.stringify(g));
    else localStorage.removeItem(GARCOM_KEY);
  }, []);

  const selecionarLoja = useCallback((id) => {
    setLojaId(id);
    localStorage.setItem(LOJA_KEY, id);
  }, []);

  const lojaAtual = lojas.find((l) => l.id === lojaId) || null;

  return (
    <MesasContext.Provider value={{ user, lojas, lojaId, lojaAtual, selecionarLoja, garcom, setGarcom, config }}>
      {children}
    </MesasContext.Provider>
  );
}

export const useMesas = () => useContext(MesasContext);