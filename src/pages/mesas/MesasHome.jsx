import { useNavigate } from "react-router-dom";
import { useMesas } from "@/lib/MesasContext";
import { Utensils, ClipboardList } from "lucide-react";

// Tela inicial do PWA: saudação + módulos (Mesas / Comanda).
export default function MesasHome() {
  const { user, lojaAtual } = useMesas() || {};
  const navigate = useNavigate();
  const primeiroNome = (user?.full_name || "").split(" ")[0] || "Atendente";

  return (
    <div className="px-4 py-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-5 mb-5 shadow-md">
        <div className="text-sm text-blue-100">Olá, {primeiroNome} 👋</div>
        <div className="text-lg font-bold">{lojaAtual?.nome || "Vitaliano Pizzaria"}</div>
        <div className="text-xs text-blue-100 mt-1">Atendimento de salão</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ModuleCard
          icon={Utensils}
          titulo="Mesas"
          descricao="Abrir e atender mesas"
          onClick={() => navigate("/mesas/garcom")}
        />
        <ModuleCard
          icon={ClipboardList}
          titulo="Comandas"
          descricao="Acompanhar pedidos"
          onClick={() => navigate("/mesas/garcom")}
        />
      </div>
    </div>
  );
}

const ModuleCard = ({ icon: Icon, titulo, descricao, onClick }) => (
  <button onClick={onClick} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left active:scale-[0.98]">
    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <div className="font-bold text-slate-800">{titulo}</div>
    <div className="text-xs text-slate-500 mt-0.5">{descricao}</div>
  </button>
);