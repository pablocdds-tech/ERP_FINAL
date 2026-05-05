import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, Camera, X, ArrowLeft } from "lucide-react";
import CameraCapture from "@/components/ponto/CameraCapture";
import { ensureModelsLoaded } from "@/lib/face-api-loader";
import { extrairDescritor, melhorMatch, DEFAULT_THRESHOLD } from "@/lib/biometria";
import { listarColaboradoresComTemplate, identificarColaboradorPorPin, registrarBatida, uploadFotoBlob, obterProximoEvento } from "@/lib/ponto-service";
import { podeRegistrarPonto } from "@/lib/ponto-permissoes";

const TIPO_LABEL = {
  entrada: "Entrada",
  intervalo_saida: "Início do intervalo",
  intervalo_volta: "Volta do intervalo",
  saida: "Saída",
};

/**
 * Fluxo completo de batida no Kiosk:
 * 1. Carrega modelos + base de templates da loja
 * 2. Abre câmera, extrai descritor da selfie
 * 3. Faz match 1:N → identifica colaborador
 * 4. Determina próximo evento e registra ponto (origem=kiosk)
 * 5. Fallback: PIN
 */
export default function KioskBatidaFlow({ device, onClose }) {
  const [fase, setFase] = useState("preparando"); // preparando | camera | processando | sucesso | falha | pin
  const [mensagem, setMensagem] = useState("Carregando...");
  const [resultado, setResultado] = useState(null);
  const [pin, setPin] = useState("");
  const [pinErro, setPinErro] = useState(null);
  const [pinSelfieBlob, setPinSelfieBlob] = useState(null);
  const candidatosRef = useRef([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await ensureModelsLoaded();
        const cands = await listarColaboradoresComTemplate(device?.loja_id);
        if (cancel) return;
        candidatosRef.current = cands;
        setFase("camera");
      } catch (e) {
        setFase("falha");
        setMensagem("Falha ao iniciar reconhecimento: " + (e?.message || "erro"));
      }
    })();
    return () => { cancel = true; };
  }, [device?.loja_id]);

  const reset = () => {
    setFase("camera");
    setMensagem("");
    setResultado(null);
    setPin("");
    setPinErro(null);
    setPinSelfieBlob(null);
  };

  const fecharComDelay = (ms = 4000) => {
    setTimeout(() => onClose?.(), ms);
  };

  const processarColaborador = async (colaborador, selfieBlob, { fallback_pin = false, pin, match_score, match_dist } = {}) => {
    if (!selfieBlob) {
      setFase("falha");
      setMensagem("Não é possível registrar ponto por PIN sem foto.");
      fecharComDelay();
      return;
    }
    const permissao = podeRegistrarPonto(colaborador, "kiosk");
    if (!permissao.ok) {
      setFase("falha");
      setMensagem(permissao.motivo);
      fecharComDelay();
      return;
    }
    setFase("processando");
    setMensagem("Registrando ponto...");
    try {
      const selfie_url = await uploadFotoBlob(selfieBlob, `kiosk-${colaborador.id}.jpg`);
      const { proximo } = await obterProximoEvento(colaborador.id);
      const tipo = proximo || "entrada";
      const out = await registrarBatida({
        colaborador,
        tipo,
        selfie_url,
        origem: "kiosk",
        dispositivo: device?.device_id,
        fallback_pin, pin,
        match_score, match_dist,
      });
      setResultado({ colaborador, tipo, status: out?.registro?.status || "registrado", offline: out?.offline });
      setFase("sucesso");
      fecharComDelay();
    } catch (e) {
      setFase("falha");
      setMensagem(e?.message || "Falha ao registrar.");
      fecharComDelay();
    }
  };

  const onCapture = async (blob, dataUrl) => {
    setFase("processando");
    setMensagem("Reconhecendo rosto...");
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      const det = await extrairDescritor(img);
      if (!det) {
        setFase("falha");
        setMensagem("Nenhum rosto detectado. Tente novamente.");
        setTimeout(() => reset(), 2500);
        return;
      }
      const match = melhorMatch(det.descriptor, candidatosRef.current, DEFAULT_THRESHOLD);
      if (!match || !match.aprovado) {
        // Caímos para PIN, mantendo selfie para auditoria
        setPinSelfieBlob(blob);
        setFase("pin");
        setMensagem("Não reconhecemos seu rosto. Digite seu PIN.");
        return;
      }
      await processarColaborador(match.match, blob, {
        match_score: match.score,
        match_dist: match.dist,
      });
    } catch (e) {
      setFase("falha");
      setMensagem("Erro: " + (e?.message || "falha"));
      setTimeout(() => reset(), 2500);
    }
  };

  const validarPin = async () => {
    setPinErro(null);
    if (!pin || pin.length < 4) {
      setPinErro("PIN inválido.");
      return;
    }
    if (!pinSelfieBlob) {
      setPinErro("Foto não capturada. Tente o reconhecimento facial novamente.");
      return;
    }
    const colaborador = await identificarColaboradorPorPin(pin, device?.loja_id);
    if (!colaborador) {
      setPinErro("PIN inválido.");
      return;
    }
    await processarColaborador(colaborador, pinSelfieBlob, { fallback_pin: true, pin });
  };

  // ---------- RENDER ----------
  if (fase === "preparando" || fase === "processando") {
    return (
      <FullScreen onClose={onClose}>
        <Loader2 className="w-12 h-12 animate-spin text-slate-300 mb-4" />
        <div className="text-lg">{mensagem || "Aguarde..."}</div>
      </FullScreen>
    );
  }

  if (fase === "camera") {
    return (
      <CameraCapture
        hint="Olhe direto para a câmera"
        onCancel={onClose}
        onCapture={onCapture}
      />
    );
  }

  if (fase === "pin") {
    return (
      <FullScreen onClose={onClose}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <KeyRound className="w-5 h-5" />
            <span className="text-sm">Identificação por PIN</span>
          </div>
          <div className="text-base text-slate-300 mb-6">{mensagem}</div>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-4 text-3xl text-center font-mono tracking-[0.5em]"
            placeholder="••••"
          />
          {pinErro && <div className="text-sm text-red-400 mt-2">{pinErro}</div>}
          <div className="flex gap-2 mt-5">
            <button onClick={() => reset()} className="flex-1 bg-slate-800 rounded-md py-3 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Tentar facial
            </button>
            <button onClick={validarPin} className="flex-1 bg-white text-slate-900 rounded-md py-3 font-medium">
              Confirmar
            </button>
          </div>
        </div>
      </FullScreen>
    );
  }

  if (fase === "sucesso" && resultado) {
    return (
      <FullScreen onClose={onClose}>
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
        <div className="text-3xl font-semibold mb-1">Olá, {resultado.colaborador.nome.split(" ")[0]}!</div>
        <div className="text-slate-300 text-lg">{TIPO_LABEL[resultado.tipo] || resultado.tipo} registrada</div>
        {resultado.status === "pendente_revisao" && (
          <div className="mt-4 inline-flex items-center gap-2 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" /> Pendente de revisão pelo gestor
          </div>
        )}
        {resultado.offline && (
          <div className="mt-4 text-xs text-slate-500">Salvo offline — sincronizará automaticamente.</div>
        )}
      </FullScreen>
    );
  }

  return (
    <FullScreen onClose={onClose}>
      <AlertCircle className="w-16 h-16 text-red-400 mb-3" />
      <div className="text-xl font-medium mb-2">Não foi possível registrar</div>
      <div className="text-slate-400 text-sm max-w-sm text-center">{mensagem}</div>
      <button onClick={onClose} className="mt-8 bg-slate-800 rounded-md px-6 py-3">Voltar</button>
    </FullScreen>
  );
}

function FullScreen({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
        <X className="w-6 h-6" />
      </button>
      {children}
    </div>
  );
}