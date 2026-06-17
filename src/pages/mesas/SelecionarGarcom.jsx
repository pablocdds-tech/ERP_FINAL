import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mesasService } from "@/lib/mesas-service";
import { useMesas } from "@/lib/MesasContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, ChevronRight } from "lucide-react";

// Tela de seleção do garçom (cards grandes). Guarda o garçom ativo no device.
export default function SelecionarGarcom() {
  const { lojaId, lojas, selecionarLoja, setGarcom } = useMesas() || {};
  const navigate = useNavigate();
  const [garcons, setGarcons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lojaId) { setLoading(false); return; }
    setLoading(true);
    mesasService.listGarcons(lojaId).then((l) => { setGarcons(l); setLoading(false); });
  }, [lojaId]);

  const escolher = (g) => {
    setGarcom({ id: g.id, nome: g.nome });
    navigate("/mesas/painel");
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Selecione o garçom</h1>
      <p className="text-sm text-slate-500 mb-5">Toque no seu nome para começar o atendimento.</p>

      {lojas?.length > 1 && (
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Loja</label>
          <Select value={lojaId} onValueChange={selecionarLoja}>
            <SelectTrigger className="h-12 bg-white"><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
            <SelectContent>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : garcons.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum colaborador ativo encontrado nesta loja.
        </div>
      ) : (
        <div className="space-y-3">
          {garcons.map((g) => (
            <button
              key={g.id}
              onClick={() => escolher(g)}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                {(g.nome || "?").charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-left font-semibold text-slate-800 truncate">{g.nome}</span>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}