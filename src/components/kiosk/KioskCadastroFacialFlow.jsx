import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, ArrowLeft, KeyRound, UserCheck } from "lucide-react";
import CameraCapture from "@/components/ponto/CameraCapture";
import { ensureModelsLoaded } from "@/lib/face-api-loader";
import { extrairDescritor, mediaDescritores, hashTemplate, MODEL_VERSION } from "@/lib/biometria";
import { uploadFotoBlob, salvarCadastroFacial, salvarTemplateBiometrico, buscarPorPin } from "@/lib/ponto-service";

const POSES = [
  { key: "frontal", label: "Frontal", hint: "Olhe direto para a câmera" },
  { key: "esquerda", label: "Levemente à esquerda", hint: "Vire um pouco o rosto à esquerda" },
  { key: "direita", label: "Levemente à direita", hint: "Vire um pouco o rosto à direita" },
];

/**
 * Fluxo de cadastro facial pelo Kiosk:
 * 1. Identifica o colaborador pelo PIN (já cadastrado no ERP pelo gestor)
 * 2. Captura 3 poses (frontal, esquerda, direita)
 * 3. Extrai descritores, gera template médio + hash
 * 4. Salva fotos + template no Colaborador
 */
export default function KioskCadastroFacialFlow({ device, onClose }) {
  const [fase, setFase] = useState("pin"); // pin | capturando | processando | sucesso | falha
  const [pin, setPin] = useState("");
  const [pinErro, setPinErro] = useState(null);
  const [colaborador, setColaborador] = useState(null);
  const [poseAtual, setPoseAtual] = useState(0);
  const [capturas, setCapturas] = useState({}); // { frontal: {blob, dataUrl}, ... }
  const [mensagem, setMensagem] = useState("");

  const fecharComDelay = (ms = 4000) => setTimeout(() => onClose?.(), ms);

  const validarPin = async () => {
    setPinErro(null);
    if (!pin || pin.length < 4) {
      setPinErro("PIN inválido.");
      return;
    }
    setFase("processando");
    setMensagem("Identificando...");
    try {
      const c = await buscarPorPin(pin, device?.loja_id);
      if (!c) {
        setFase("pin");
        setPinErro("PIN não encontrado. Peça ao gestor para cadastrar você no sistema.");
        return;
      }
      setColaborador(c);
      setPoseAtual(0);
      setCapturas({});
      setFase("capturando");
    } catch (e) {
      setFase("falha");
      setMensagem("Erro: " + (e?.message || "falha"));
      fecharComDelay();
    }
  };

  const onCapture = (blob, dataUrl) => {
    const pose = POSES[poseAtual];
    const novas = { ...capturas, [pose.key]: { blob, dataUrl } };
    setCapturas(novas);
    if (poseAtual < POSES.length - 1) {
      setPoseAtual(poseAtual + 1);
    } else {
      finalizarCadastro(novas);
    }
  };

  const finalizarCadastro = async (todas) => {
    setFase("processando");
    setMensagem("Processando fotos...");
    try {
      await ensureModelsLoaded();

      // Upload das 3 fotos
      setMensagem("Enviando fotos...");
      const urls = {};
      for (const p of POSES) {
        const item = todas[p.key];
        if (item) {
          urls[`${p.key}_url`] = await uploadFotoBlob(item.blob, `facial-${colaborador.id}-${p.key}.jpg`);
        }
      }

      // Extrai descritores
      setMensagem("Gerando template biométrico...");
      const descritores = [];
      for (const p of POSES) {
        const item = todas[p.key];
        if (!item) continue;
        const img = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = item.dataUrl;
        });
        const det = await extrairDescritor(img);
        if (det?.descriptor) descritores.push(det.descriptor);
      }

      if (!descritores.length) {
        setFase("falha");
        setMensagem("Nenhum rosto foi detectado nas fotos. Tente novamente em local mais iluminado.");
        fecharComDelay();
        return;
      }

      // Salva fotos e template
      await salvarCadastroFacial(colaborador.id, urls);
      const media = mediaDescritores(descritores);
      const hash = await hashTemplate(media);
      await salvarTemplateBiometrico(colaborador.id, {
        descriptor: media,
        hash,
        versao: MODEL_VERSION,
        consentir: true,
      });

      setFase("sucesso");
      setMensagem(`Cadastro facial concluído com ${descritores.length} pose(s).`);
      fecharComDelay(5000);
    } catch (e) {
      setFase("falha");
      setMensagem("Falha: " + (e?.message || "erro"));
      fecharComDelay();
    }
  };

  // ---------- RENDER ----------
  if (fase === "pin") {
    return (
      <FullScreen onClose={onClose}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <UserCheck className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Cadastro Facial</span>
          </div>
          <div className="text-2xl font-semibold mb-2">Digite seu PIN</div>
          <div className="text-sm text-slate-400 mb-6">
            O gestor já deve ter cadastrado você no sistema com um PIN. Se não tiver, procure-o antes.
          </div>
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <KeyRound className="w-4 h-4" />
            <span className="text-xs">PIN do colaborador</span>
          </div>
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
            <button onClick={onClose} className="flex-1 bg-slate-800 rounded-md py-3 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={validarPin} className="flex-1 bg-white text-slate-900 rounded-md py-3 font-medium">
              Continuar
            </button>
          </div>
        </div>
      </FullScreen>
    );
  }

  if (fase === "capturando" && colaborador) {
    const pose = POSES[poseAtual];
    return (
      <CameraCapture
        key={`pose-${pose.key}-${poseAtual}`}
        hint={`${colaborador.nome.split(" ")[0]} — ${pose.label} (${poseAtual + 1}/${POSES.length}): ${pose.hint}`}
        onCancel={onClose}
        onCapture={onCapture}
      />
    );
  }

  if (fase === "processando") {
    return (
      <FullScreen onClose={onClose}>
        <Loader2 className="w-12 h-12 animate-spin text-slate-300 mb-4" />
        <div className="text-lg">{mensagem || "Aguarde..."}</div>
      </FullScreen>
    );
  }

  if (fase === "sucesso") {
    return (
      <FullScreen onClose={onClose}>
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
        <div className="text-3xl font-semibold mb-1">Tudo pronto, {colaborador?.nome.split(" ")[0]}!</div>
        <div className="text-slate-300 text-base">{mensagem}</div>
        <div className="text-slate-500 text-sm mt-4">Agora você já pode bater ponto pelo reconhecimento facial.</div>
      </FullScreen>
    );
  }

  return (
    <FullScreen onClose={onClose}>
      <AlertCircle className="w-16 h-16 text-red-400 mb-3" />
      <div className="text-xl font-medium mb-2">Não foi possível concluir</div>
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