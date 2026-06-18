import { base44 } from "@/api/base44Client";
import { fmtMoeda, fmtData } from "@/lib/format";

// Reexportado do util central para compatibilidade.
export { fmtMoeda, fmtData };

// CRM de clientes — chama a função de análise no backend.
export const crmService = {
  perfis: async () => {
    const { data } = await base44.functions.invoke("crmClienteAnalytics", { action: "perfis" });
    return data;
  },
  perfil: async (phone) => {
    const { data } = await base44.functions.invoke("crmClienteAnalytics", { action: "perfil", phone });
    return data;
  },
  buscaSabor: async (termo, diaIdx) => {
    const { data } = await base44.functions.invoke("crmClienteAnalytics", {
      action: "busca_sabor",
      termo,
      dia_idx: diaIdx,
    });
    return data;
  },
};

export const DIAS_SEMANA = [
  { idx: 0, label: "Domingo", curto: "Dom" },
  { idx: 1, label: "Segunda", curto: "Seg" },
  { idx: 2, label: "Terça", curto: "Ter" },
  { idx: 3, label: "Quarta", curto: "Qua" },
  { idx: 4, label: "Quinta", curto: "Qui" },
  { idx: 5, label: "Sexta", curto: "Sex" },
  { idx: 6, label: "Sábado", curto: "Sáb" },
];