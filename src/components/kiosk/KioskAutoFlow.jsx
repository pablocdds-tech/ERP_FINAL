import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, ShieldOff, X, UserCheck, Camera as CameraIcon } from "lucide-react";
import { ensureModelsLoaded } from "@/lib/face-api-loader";
import { extrairDescritor, melhorMatch, DEFAULT_THRESHOLD } from "@/lib/biometria";
import {
  listarColaboradoresComTemplate,
  identificarColaboradorPorPin,
  registrarBatida,
  uploadFotoBlob,
  obterProximoEvento,
} from "@/lib/ponto-service";
import { podeRegistrarPonto } from "@/lib/ponto-permissoes";
import { registrarLog } from "@/lib/auditoria-service";

const TIPO_LABEL = {
  entrada: "Entrada",
  intervalo_saida: "Saída intervalo",
  intervalo_volta: "Volta do intervalo",
  saida: "Saída final",
};

/**
 * Kiosk com detecção automática de rosto + confirmação manual.
 *
 * Estados (state.fase):
 *   iniciando_camera | aguardando_rosto | processando_reconhecimento
 *   reconhecido (aguardando_confirmacao) | registrando
 *   sucesso | erro | nao_reconhecido | fallback_pin | bloqueio_rebatida
 *
 * O loop de leitura é pausado durante: reconhecido, registrando, sucesso, erro,
 * fallback_pin e bloqueio_rebatida. Volta a aguardar_rosto após o reset.
 */
export default function KioskAutoFlow({ device, config }) {
  const intervaloLeituraMs = Math.max(800, (Number(config?.["ponto.kiosk.intervalo_leitura_seg"]) || 2) * 1000);
  const tentativasAntesPin = Math.max(1, Number(config?.["ponto.kiosk.tentativas_antes_pin"]) || 3);
  const tempoResetMs = Math.max(2, Number(config?.["ponto.kiosk.tempo_reset_seg"]) || 5) * 1000;
  const bloqueioRebatidaSeg = Math.max(10, Number(config?.["ponto.kiosk.bloqueio_rebatida_seg"]) || 60);
  const threshold = Number(config?.["ponto.bio.threshold_match"]) || DEFAULT_THRESHOLD;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const processandoRef = useRef(false);
  const candidatosRef = useRef([]);
  const ultimasBatidasRef = useRef(new Map()); // colaborador_id -> timestamp ms
  const tentativasFalhaRef = useRef(0);

  const [fase, setFase] = useState("iniciando_camera");
  const [statusMsg, setStatusMsg] = useState("Iniciando câmera...");
  const [cameraErro, setCameraErro] = useState(null);
  const [reconhecido, setReconhecido] = useState(null); // { colaborador, score, dist, proximo, frameBlob, frameUrl }
  const [resultado, setResultado] = useState(null); // { colaborador, tipo, status, offline }
  const [erroMsg, setErroMsg] = useState(null);
  const [pin, setPin] = useState("");
  const [pinErro, setPinErro] = useState(null);
  const [pinSelfieBlob, setPinSelfieBlob] = useState(null);

  // ---------- INIT (modelos + base de templates + câmera) ----------
  const iniciarCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraErro(null);
      try {
        await registrarLog({
          modulo: "rh", acao: "outros", entidade: "Kiosk",
          descricao: "Câmera iniciada automaticamente",
          origem: "humano", loja_id: device?.loja_id,
          valor_novo: { dispositivo: device?.device_id }, critico: false,
        });
      } catch { /* */ }
      return true;
    } catch (e) {
      setCameraErro(e?.message || "Não foi possível acessar a câmera. Verifique a permissão.");
      try {
        await registrarLog({
          modulo: "rh", acao: "outros", entidade: "Kiosk",
          descricao: "Falha ao iniciar câmera automaticamente",
          origem: "humano", loja_id: device?.loja_id,
          valor_novo: { dispositivo: device?.device_id, erro: e?.message }, critico: true,
        });
      } catch { /* */ }
      return false;
    }
  }, [device?.device_id, device?.loja_id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setStatusMsg("Carregando modelo facial...");
        await ensureModelsLoaded();
        if (cancel) return;
        setStatusMsg("Carregando colaboradores...");
        candidatosRef.current = await listarColaboradoresComTemplate(device?.loja_id);
        if (cancel) return;
        const ok = await iniciarCamera();
        if (cancel) return;
        if (ok) {
          setFase("aguardando_rosto");
          setStatusMsg("Aproxime-se e olhe para a câmera");
        }
      } catch (e) {
        setCameraErro("Falha ao iniciar: " + (e?.message || "erro"));
      }
    })();
    return () => {
      cancel = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [device?.loja_id, iniciarCamera]);

  // ---------- LOOP DE LEITURA ----------
  const podeLerAgora = () => fase === "aguardando_rosto" || fase === "nao_reconhecido";

  useEffect(() => {
    if (loopRef.current) clearTimeout(loopRef.current);
    if (!podeLerAgora() || cameraErro) return;
    loopRef.current = setTimeout(() => {
      tentarReconhecer();
    }, intervaloLeituraMs);
    return () => loopRef.current && clearTimeout(loopRef.current);
    // eslint-disable-next-line
  }, [fase, intervaloLeituraMs, cameraErro]);

  const capturarFrame = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return null;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    return { dataUrl, blob };
  };

  const tentarReconhecer = async () => {
    if (processandoRef.current) return;
    if (!podeLerAgora()) return;
    processandoRef.current = true;
    try {
      setFase("processando_reconhecimento");
      setStatusMsg("Reconhecendo...");
      const det = await extrairDescritor(videoRef.current);
      if (!det) {
        // não tem rosto na frente — volta a aguardar (não conta tentativa)
        setFase("aguardando_rosto");
        setStatusMsg("Aproxime-se e olhe para a câmera");
        return;
      }
      const match = melhorMatch(det.descriptor, candidatosRef.current, threshold);
      if (!match || !match.aprovado) {
        tentativasFalhaRef.current += 1;
        try {
          await registrarLog({
            modulo: "rh", acao: "outros", entidade: "Kiosk",
            descricao: "Rosto detectado, sem match (kiosk_auto)",
            origem: "humano", loja_id: device?.loja_id,
            valor_novo: { dispositivo: device?.device_id, dist: match?.dist, score: match?.score, tentativa: tentativasFalhaRef.current },
            critico: false,
          });
        } catch { /* */ }
        if (tentativasFalhaRef.current >= tentativasAntesPin) {
          setFase("fallback_pin");
          const frame = await capturarFrame();
          setPinSelfieBlob(frame?.blob || null);
        } else {
          setFase("nao_reconhecido");
          setStatusMsg("Não reconhecido. Ajuste o rosto e tente novamente.");
        }
        return;
      }

      // Match aprovado — captura frame para registrar com a foto
      const frame = await capturarFrame();
      const colaborador = match.match;

      // Permissão de canal
      const permissao = podeRegistrarPonto(colaborador, "kiosk_auto");
      if (!permissao.ok) {
        setErroMsg(permissao.motivo);
        setFase("erro");
        agendarReset();
        return;
      }

      // Bloqueio anti-rebatida
      const ultima = ultimasBatidasRef.current.get(colaborador.id);
      if (ultima && (Date.now() - ultima) < bloqueioRebatidaSeg * 1000) {
        try {
          await registrarLog({
            modulo: "rh", acao: "bloquear", entidade: "RegistroPonto",
            descricao: `Tentativa duplicada bloqueada (${colaborador.nome}) — kiosk_auto`,
            origem: "humano", loja_id: device?.loja_id,
            valor_novo: { dispositivo: device?.device_id, colaborador_id: colaborador.id }, critico: false,
          });
        } catch { /* */ }
        setReconhecido({ colaborador, score: match.score, dist: match.dist });
        setFase("bloqueio_rebatida");
        agendarReset();
        return;
      }

      // Próximo evento
      const { proximo } = await obterProximoEvento(colaborador.id);
      if (!proximo) {
        setReconhecido({ colaborador, score: match.score, dist: match.dist });
        setErroMsg(`${colaborador.nome.split(" ")[0]}, todos os pontos do dia já foram registrados.`);
        setFase("erro");
        agendarReset();
        return;
      }

      tentativasFalhaRef.current = 0;
      setReconhecido({
        colaborador,
        score: match.score,
        dist: match.dist,
        proximo,
        frameBlob: frame?.blob,
        frameUrl: frame?.dataUrl,
      });
      setFase("reconhecido");
      try {
        await registrarLog({
          modulo: "rh", acao: "outros", entidade: "Kiosk",
          descricao: `Reconhecimento OK: ${colaborador.nome} (kiosk_auto)`,
          origem: "humano", loja_id: device?.loja_id,
          valor_novo: { dispositivo: device?.device_id, colaborador_id: colaborador.id, score: match.score, dist: match.dist, proximo },
          critico: false,
        });
      } catch { /* */ }
    } catch (e) {
      setErroMsg(e?.message || "Erro inesperado");
      setFase("erro");
      agendarReset();
    } finally {
      processandoRef.current = false;
    }
  };

  // ---------- AÇÕES ----------
  const agendarReset = () => {
    setTimeout(() => {
      setReconhecido(null);
      setResultado(null);
      setErroMsg(null);
      setPin("");
      setPinErro(null);
      setPinSelfieBlob(null);
      setFase("aguardando_rosto");
      setStatusMsg("Aproxime-se e olhe para a câmera");
    }, tempoResetMs);
  };

  const confirmarPonto = async () => {
    if (!reconhecido) return;
    setFase("registrando");
    setStatusMsg("Registrando ponto...");
    try {
      const selfie_url = reconhecido.frameBlob
        ? await uploadFotoBlob(reconhecido.frameBlob, `kiosk-auto-${reconhecido.colaborador.id}.jpg`)
        : null;
      if (!selfie_url) {
        setErroMsg("Falha ao salvar foto. Tente novamente.");
        setFase("erro");
        agendarReset();
        return;
      }
      const out = await registrarBatida({
        colaborador: reconhecido.colaborador,
        tipo: reconhecido.proximo,
        selfie_url,
        origem: "kiosk_auto",
        dispositivo: device?.device_id,
        match_score: reconhecido.score,
        match_dist: reconhecido.dist,
        threshold_usado: threshold,
      });
      ultimasBatidasRef.current.set(reconhecido.colaborador.id, Date.now());
      setResultado({
        colaborador: reconhecido.colaborador,
        tipo: reconhecido.proximo,
        status: out?.registro?.status || "registrado",
        offline: out?.offline,
      });
      setFase("sucesso");
      agendarReset();
    } catch (e) {
      setErroMsg(e?.message || "Falha ao registrar.");
      setFase("erro");
      agendarReset();
    }
  };

  const naoSouEu = async () => {
    try {
      await registrarLog({
        modulo: "rh", acao: "outros", entidade: "Kiosk",
        descricao: `Usuário negou identidade (kiosk_auto): ${reconhecido?.colaborador?.nome}`,
        origem: "humano", loja_id: device?.loja_id,
        valor_novo: { dispositivo: device?.device_id, colaborador_id: reconhecido?.colaborador?.id }, critico: false,
      });
    } catch { /* */ }
    setReconhecido(null);
    tentativasFalhaRef.current = 0;
    setFase("aguardando_rosto");
    setStatusMsg("Aproxime-se e olhe para a câmera");
  };

  const validarPin = async () => {
    setPinErro(null);
    if (!pin || pin.length < 4) {
      setPinErro("PIN inválido.");
      return;
    }
    setFase("registrando");
    setStatusMsg("Validando PIN...");
    try {
      // Foto é obrigatória — se não capturamos antes, captura agora
      let selfieBlob = pinSelfieBlob;
      if (!selfieBlob) {
        const frame = await capturarFrame();
        selfieBlob = frame?.blob || null;
      }
      if (!selfieBlob) {
        setErroMsg("Não é possível registrar ponto por PIN sem foto.");
        setFase("erro");
        agendarReset();
        return;
      }
      const colaborador = await identificarColaboradorPorPin(pin, device?.loja_id);
      if (!colaborador) {
        setPinErro("PIN inválido.");
        setFase("fallback_pin");
        return;
      }
      const selfie_url = await uploadFotoBlob(selfieBlob, `kiosk-pin-${colaborador.id}.jpg`);
      const { proximo } = await obterProximoEvento(colaborador.id);
      const out = await registrarBatida({
        colaborador,
        tipo: proximo || "entrada",
        selfie_url,
        origem: "kiosk",
        dispositivo: device?.device_id,
        fallback_pin: true,
        pin,
      });
      ultimasBatidasRef.current.set(colaborador.id, Date.now());
      tentativasFalhaRef.current = 0;
      setResultado({
        colaborador,
        tipo: proximo || "entrada",
        status: out?.registro?.status || "pendente_revisao",
        offline: out?.offline,
      });
      setFase("sucesso");
      agendarReset();
    } catch (e) {
      setErroMsg(e?.message || "Falha ao registrar.");
      setFase("erro");
      agendarReset();
    }
  };

  // ---------- RENDER ----------
  if (cameraErro) {
    return (
      <Overlay>
        <CameraIcon className="w-12 h-12 text-slate-400 mb-3" />
        <div className="text-lg font-medium mb-2">Câmera indisponível</div>
        <div className="text-sm text-slate-400 max-w-sm text-center mb-6">
          Não foi possível iniciar a câmera automaticamente. Toque em Ativar câmera para liberar o acesso.
        </div>
        <button
          onClick={() => { setCameraErro(null); setFase("iniciando_camera"); iniciarCamera().then(ok => ok && setFase("aguardando_rosto")); }}
          className="bg-white text-slate-900 rounded-md px-6 py-3 font-medium"
        >
          Ativar câmera
        </button>
      </Overlay>
    );
  }

  return (
    <div className="flex-1 flex flex-col landscape:flex-row items-stretch w-full min-h-0">
      {/* Câmera — ocupa a maior parte: ~65vh em vertical, ~100% altura e ~60-70% largura em horizontal */}
      <div
        className="relative bg-black overflow-hidden landscape:flex-1 portrait:w-full"
        style={{ minHeight: "min(65vh, 720px)" }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Moldura oval grande e responsiva (clamp garante tamanho mínimo em tablet) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-[42%] border-[3px] border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
            style={{
              width: "clamp(280px, 45vmin, 520px)",
              height: "clamp(360px, 60vmin, 680px)",
            }}
          />
        </div>
        {/* Hint central abaixo da moldura */}
        {(fase === "aguardando_rosto" || fase === "nao_reconhecido" || fase === "processando_reconhecimento") && (
          <div className="absolute inset-x-0 bottom-6 text-center text-white text-base sm:text-lg font-medium drop-shadow-lg pointer-events-none">
            Enquadre seu rosto aqui
          </div>
        )}
        {/* Badge de status */}
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur">
          <span className={`w-2.5 h-2.5 rounded-full ${fase === "aguardando_rosto" || fase === "nao_reconhecido" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {labelFase(fase)}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Painel — embaixo em vertical, à direita em horizontal */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col landscape:w-[clamp(360px,32vw,460px)] portrait:w-full portrait:flex-1">
        <PainelDireito
          fase={fase}
          statusMsg={statusMsg}
          reconhecido={reconhecido}
          resultado={resultado}
          erroMsg={erroMsg}
          onConfirmar={confirmarPonto}
          onNaoSouEu={naoSouEu}
          pin={pin}
          setPin={setPin}
          pinErro={pinErro}
          onValidarPin={validarPin}
          onCancelarPin={() => { setFase("aguardando_rosto"); setPin(""); setPinErro(null); tentativasFalhaRef.current = 0; }}
        />
      </div>
    </div>
  );
}

function labelFase(fase) {
  switch (fase) {
    case "iniciando_camera": return "Iniciando câmera...";
    case "aguardando_rosto": return "Aguardando rosto";
    case "processando_reconhecimento": return "Reconhecendo...";
    case "reconhecido": return "Reconhecido";
    case "registrando": return "Registrando";
    case "sucesso": return "Ponto registrado";
    case "erro": return "Erro";
    case "nao_reconhecido": return "Não reconhecido";
    case "fallback_pin": return "Modo PIN";
    case "bloqueio_rebatida": return "Aguarde...";
    default: return fase;
  }
}

function PainelDireito({ fase, statusMsg, reconhecido, resultado, erroMsg, onConfirmar, onNaoSouEu, pin, setPin, pinErro, onValidarPin, onCancelarPin }) {
  if (fase === "iniciando_camera") {
    return (
      <CenteredCol>
        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
        <div className="text-base text-slate-300">{statusMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "aguardando_rosto" || fase === "processando_reconhecimento" || fase === "nao_reconhecido") {
    return (
      <CenteredCol>
        <UserCheck className="w-12 h-12 text-emerald-400 mb-4" />
        <div className="text-2xl font-semibold mb-2 text-center">Aproxime-se e olhe para a câmera</div>
        <div className="text-sm text-slate-400 text-center">{statusMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "reconhecido" && reconhecido) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="text-xs uppercase tracking-widest text-emerald-400 mb-2">Reconhecido</div>
        <div className="text-3xl font-semibold mb-1 leading-tight">{reconhecido.colaborador.nome}</div>
        <div className="text-sm text-slate-400 mb-6">
          Confiança: {(reconhecido.score * 100).toFixed(0)}%
        </div>
        <div className="bg-slate-800 rounded-lg p-5 mb-6">
          <div className="text-xs text-slate-400 mb-1">Próximo ponto</div>
          <div className="text-2xl font-semibold">{TIPO_LABEL[reconhecido.proximo] || reconhecido.proximo}</div>
        </div>
        <div className="mt-auto space-y-3">
          <button
            onClick={onConfirmar}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md py-4 text-lg font-semibold"
          >
            Confirmar ponto
          </button>
          <button
            onClick={onNaoSouEu}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md py-3 text-sm"
          >
            Não sou eu
          </button>
        </div>
      </div>
    );
  }

  if (fase === "registrando") {
    return (
      <CenteredCol>
        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
        <div className="text-lg">{statusMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "sucesso" && resultado) {
    return (
      <CenteredCol>
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
        <div className="text-3xl font-semibold mb-1">Olá, {resultado.colaborador.nome.split(" ")[0]}!</div>
        <div className="text-slate-300 text-base">{TIPO_LABEL[resultado.tipo] || resultado.tipo} registrada</div>
        {resultado.status === "pendente_revisao" && (
          <div className="mt-4 inline-flex items-center gap-2 text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4" /> Pendente de revisão
          </div>
        )}
        {resultado.offline && <div className="mt-4 text-xs text-slate-500">Salvo offline</div>}
      </CenteredCol>
    );
  }

  if (fase === "bloqueio_rebatida") {
    return (
      <CenteredCol>
        <ShieldOff className="w-16 h-16 text-amber-400 mb-3" />
        <div className="text-xl font-medium mb-2 text-center">Ponto já registrado agora</div>
        <div className="text-sm text-slate-400 text-center">Aguarde alguns instantes antes de bater novamente.</div>
      </CenteredCol>
    );
  }

  if (fase === "erro") {
    return (
      <CenteredCol>
        <AlertCircle className="w-16 h-16 text-red-400 mb-3" />
        <div className="text-xl font-medium mb-2 text-center">Não foi possível registrar</div>
        <div className="text-sm text-slate-400 text-center">{erroMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "fallback_pin") {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-amber-400 mb-3">
          <KeyRound className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Modo PIN</span>
        </div>
        <div className="text-2xl font-semibold mb-2">Não conseguimos te reconhecer</div>
        <div className="text-sm text-slate-400 mb-6">Digite seu PIN para registrar o ponto.</div>
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
        <div className="mt-auto flex gap-2 pt-6">
          <button onClick={onCancelarPin} className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-md py-3 text-sm">
            Tentar facial
          </button>
          <button onClick={onValidarPin} className="flex-1 bg-white text-slate-900 rounded-md py-3 font-medium">
            Confirmar
          </button>
        </div>
      </div>
    );
  }

  return <CenteredCol><div className="text-slate-400">{statusMsg}</div></CenteredCol>;
}

function CenteredCol({ children }) {
  return <div className="flex-1 flex flex-col items-center justify-center text-center">{children}</div>;
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      {children}
    </div>
  );
}