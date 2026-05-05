import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { solicitarRegistroDispositivo, obterOuGerarDeviceId } from "@/lib/kiosk-device-service";

export default function KioskSetup() {
  const [lojas, setLojas] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const deviceId = obterOuGerarDeviceId();

  useEffect(() => {
    base44.entities.Loja.filter({ ativo: true }).then(setLojas);
  }, []);

  const enviar = async () => {
    if (!lojaId || !nome) return;
    setEnviando(true);
    await solicitarRegistroDispositivo({ loja_id: lojaId, nome_dispositivo: nome });
    setEnviado(true);
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-2xl font-semibold mb-2">Solicitação enviada</div>
          <p className="text-slate-400 text-sm">
            Aguardando autorização do gestor no ERP. Este tablet liberará o ponto automaticamente assim que for autorizado.
          </p>
          <p className="text-[11px] text-slate-600 mt-6 font-mono">{deviceId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-2xl font-semibold mb-2">Cadastrar tablet</div>
        <p className="text-sm text-slate-400 mb-6">
          Vincule este dispositivo a uma loja. Um gestor precisa autorizar no ERP antes do uso.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Loja</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-base"
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nome do tablet</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-base"
              placeholder="Ex: Tablet Caixa 1"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <button
            disabled={enviando || !lojaId || !nome}
            onClick={enviar}
            className="w-full bg-white text-slate-900 rounded-md py-3 font-medium disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar solicitação"}
          </button>
          <p className="text-[11px] text-slate-600 mt-4 font-mono break-all">{deviceId}</p>
        </div>
      </div>
    </div>
  );
}