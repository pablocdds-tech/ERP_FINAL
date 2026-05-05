import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, ShieldOff, UserCheck, Camera as CameraIcon } from "lucide-react";
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
 * Kiosk com detecção automática de rosto.
 * - Alta confiança (score >= scoreMinAuto): registra automaticamente sem clique.
 * - Baixa confiança: mostra tela de confirmação manual (mesmo executor).
 * - Sem match após N tentativas: oferece fallback PIN (sempre exige foto).
 *
 * Robustez:
 * - device_id e loja_id são "congelados" em useRef no mount → imune a re-render por giro.
 * - frameBlob fica em useRef além de useState → não se perde ao reorientar.
 * - Validação rigorosa do payload antes de chamar registrarPontoSeguro.
 */
export default function KioskAutoFlow({ device, config }) {
  const intervaloLeituraMs = Math.max(800, (Number(config?.["ponto.kiosk.intervalo_leitura_seg"]) || 2) * 1000);
  const tentativasAntesPin = Math.max(1, Number(config?.["ponto.kiosk.tentativas_antes_pin"]) || 3);
  const tempoResetMs = Math.max(2, Number(config?.["ponto.kiosk.tempo_reset_seg"]) || 5) * 1000;
  const bloqueioRebatidaSeg = Math.max(10, Number(config?.["ponto.kiosk.bloqueio_rebatida_seg"]) || 60);
  const threshold = Number(config?.["ponto.bio.threshold_match"]) || DEFAULT_THRESHOLD;
  const autoRegistroAtivo = config?.["ponto.kiosk.auto_registro"] !== false;
  const scoreMinAuto = Math.max(0, Math.min(1, Number(config?.["ponto.kiosk.auto_registro_score_min"]) || 0.65));
  const tempoMsgSucessoMs = Math.max(1, Number(config?.["ponto.kiosk.tempo_msg_sucesso_seg"]) || 3) * 1000;

  // ---------- IDENTIDADE DO DISPOSITIVO (congela no mount, imune a re-render) ----------
  const deviceIdRef = useRef(device?.device_id || null);
  const lojaIdRef = useRef(device?.loja_id || null);
  // Atualiza se eventualmente o device chegar depois (mas nunca apaga uma vez setado)
  useEffect(() => {
    if (device?.device_id && !deviceIdRef.current) deviceIdRef.current = device.device_id;
    if (device?.loja_id && !lojaIdRef.current) lojaIdRef.current = device.loja_id;
  }, [device?.device_id, device?.loja_id]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const processandoRef = useRef(false);
  const candidatosRef = useRef([]);
  const ultimasBatidasRef = useRef(new Map());
  const tentativasFalhaRef = useRef(0);
  // Frame ref (sobrevive a giro/re-render — espelha o state)
  const reconhecidoRef = useRef(null);

  const [fase, setFase] = useState("iniciando_camera");
  const [statusMsg, setStatusMsg] = useState("Iniciando câmera...");
  const [cameraErro, setCameraErro] = useState(null);
  const [reconhecido, setReconhecido] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erroMsg, setErroMsg] = useState(null);
  const [pin, setPin] = useState("");
  const [pinErro, setPinErro] = useState(null);
  const [pinSelfieBlob, setPinSelfieBlob] = useState(null);

  const setReconhecidoSafe = (v) => {
    reconhecidoRef.current = v;
    setReconhecido(v);
  };

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
          origem: "humano", loja_id: lojaIdRef.current,
          valor_novo: { dispositivo: deviceIdRef.current }, critico: false,
        });
      } catch { /* */ }
      return true;
    } catch (e) {
      setCameraErro(e?.message || "Não foi possível acessar a câmera. Verifique a permissão.");
      try {
        await registrarLog({
          modulo: "rh", acao: "outros", entidade: "Kiosk",
          descricao: "Falha ao iniciar câmera automaticamente",
          origem: "humano", loja_id: lojaIdRef.current,
          valor_novo: { dispositivo: deviceIdRef.current, erro: e?.message }, critico: true,
        });
      } catch { /* */ }
      return false;
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setStatusMsg("Carregando modelo facial...");
        await ensureModelsLoaded();
        if (cancel) return;
        setStatusMsg("Carregando colaboradores...");
        candidatosRef.current = await listarColaboradoresComTemplate(lojaIdRef.current);
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
  }, [iniciarCamera]);

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

  const agendarReset = (ms = tempoResetMs) => {
    setTimeout(() => {
      setReconhecidoSafe(null);
      setResultado(null);
      setErroMsg(null);
      setPin("");
      setPinErro(null);
      setPinSelfieBlob(null);
      setFase("aguardando_rosto");
      setStatusMsg("Aproxime-se e olhe para a câmera");
    }, ms);
  };

  /**
   * Função ÚNICA de registro do ponto no Kiosk.
   * Usada por: auto-registro (alta confiança) E confirmação manual (baixa confiança).
   *
   * Garante:
   *  - colaborador, próximo, frameBlob presentes
   *  - device_id e loja_id válidos (congelados em ref)
   *  - upload da foto antes de chamar backend
   *  - payload completo enviado a registrarPontoSeguro
   *  - mensagens de erro claras para o usuário
   */
  const executarRegistroKiosk = async (dadosBase) => {
    // Garante que sempre usamos a versão mais recente do reconhecido
    const dados = dadosBase || reconhecidoRef.current;
    if (!dados?.colaborador?.id) {
      setErroMsg("Reconhecimento perdido. Aproxime-se da câmera novamente.");
      setFase("erro");
      agendarReset();
      return;
    }
    if (!dados.proximo) {
      setErroMsg("Não foi possível identificar o próximo ponto. Tente novamente.");
      setFase("erro");
      agendarReset();
      return;
    }
    if (!dados.frameBlob) {
      setErroMsg("Foto do ponto não encontrada. Enquadre o rosto novamente.");
      setFase("erro");
      agendarReset();
      return;
    }
    if (!deviceIdRef.current) {
      setErroMsg("Dispositivo Kiosk não identificado. Reinicie o tablet.");
      setFase("erro");
      try {
        await registrarLog({
          modulo: "rh", acao: "bloquear", entidade: "Kiosk",
          descricao: "Tentativa de registro sem device_id (frontend)",
          origem: "humano", loja_id: lojaIdRef.current,
          valor_novo: { colaborador_id: dados.colaborador.id, origem: "kiosk_auto" }, critico: true,
        });
      } catch { /* */ }
      agendarReset();
      return;
    }

    setFase("registrando");
    setStatusMsg(`Registrando ${TIPO_LABEL[dados.proximo] || dados.proximo}...`);

    try {
      const selfie_url = await uploadFotoBlob(
        dados.frameBlob,
        `kiosk-auto-${dados.colaborador.id}.jpg`
      );
      if (!selfie_url) {
        setErroMsg("Falha ao salvar foto. Tente novamente.");
        setFase("erro");
        agendarReset();
        return;
      }

      // Validação final do payload (frontend) antes de chamar o backend.
      // Bloqueia chamadas com campos críticos ausentes e expõe o motivo na tela.
      const payloadDebug = {
        colaborador_id: dados.colaborador.id,
        tipo: dados.proximo,
        origem: "kiosk_auto",
        loja_id: lojaIdRef.current,
        device_id: deviceIdRef.current,
        tem_selfie_url: !!selfie_url,
        match_score: dados.score,
        match_dist: dados.dist,
        threshold_usado: threshold,
      };
      // Log seguro (sem PIN, sem foto) — visível no console do tablet para diagnóstico
      // eslint-disable-next-line no-console
      console.log("[Kiosk] payload kiosk_auto →", payloadDebug);

      const camposObrigatorios = ["colaborador_id", "tipo", "origem", "device_id", "tem_selfie_url"];
      const ausentes = camposObrigatorios.filter((k) => !payloadDebug[k]);
      if (ausentes.length) {
        const motivo = `Campos ausentes no envio: ${ausentes.join(", ")}`;
        try {
          await registrarLog({
            modulo: "rh", acao: "bloquear", entidade: "RegistroPonto",
            descricao: `Payload bloqueado no frontend: ${motivo}`,
            origem: "humano", loja_id: lojaIdRef.current,
            valor_novo: payloadDebug, critico: true,
          });
        } catch { /* */ }
        setErroMsg(motivo);
        setFase("erro");
        agendarReset();
        return;
      }

      const out = await registrarBatida({
        colaborador: dados.colaborador,
        tipo: dados.proximo,
        selfie_url,
        origem: "kiosk_auto",
        dispositivo: deviceIdRef.current, // ← sempre presente, vindo da ref
        match_score: dados.score,
        match_dist: dados.dist,
        threshold_usado: threshold,
      });

      ultimasBatidasRef.current.set(dados.colaborador.id, Date.now());
      setResultado({
        colaborador: dados.colaborador,
        tipo: dados.proximo,
        status: out?.registro?.status || "registrado",
        offline: out?.offline,
      });
      setFase("sucesso");
      agendarReset(tempoMsgSucessoMs);
    } catch (e) {
      // Auditoria de erro de registro com payload mínimo (sem PIN)
      try {
        await registrarLog({
          modulo: "rh", acao: "bloquear", entidade: "RegistroPonto",
          descricao: `Falha ao registrar ponto kiosk_auto: ${e?.message || "erro"}`,
          origem: "humano", loja_id: lojaIdRef.current,
          valor_novo: {
            colaborador_id: dados.colaborador.id,
            origem: "kiosk_auto",
            device_id: deviceIdRef.current,
            tem_selfie_url: true,
            match_score: dados.score,
            tipo: dados.proximo,
            codigo: e?.codigo,
            status_http: e?.status,
          },
          critico: true,
        });
      } catch { /* */ }
      // Mensagem rica: motivo + código técnico (ajuda diagnóstico em produção)
      const codigo = e?.codigo ? ` [${e.codigo}]` : "";
      setErroMsg((e?.message || "Falha ao registrar.") + codigo);
      setFase("erro");
      agendarReset();
    }
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
            origem: "humano", loja_id: lojaIdRef.current,
            valor_novo: { dispositivo: deviceIdRef.current, dist: match?.dist, score: match?.score, tentativa: tentativasFalhaRef.current },
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

      const frame = await capturarFrame();
      const colaborador = match.match;

      const permissao = podeRegistrarPonto(colaborador, "kiosk_auto");
      if (!permissao.ok) {
        setErroMsg(permissao.motivo);
        setFase("erro");
        agendarReset();
        return;
      }

      const ultima = ultimasBatidasRef.current.get(colaborador.id);
      if (ultima && (Date.now() - ultima) < bloqueioRebatidaSeg * 1000) {
        try {
          await registrarLog({
            modulo: "rh", acao: "bloquear", entidade: "RegistroPonto",
            descricao: `Tentativa duplicada bloqueada (${colaborador.nome}) — kiosk_auto`,
            origem: "humano", loja_id: lojaIdRef.current,
            valor_novo: { dispositivo: deviceIdRef.current, colaborador_id: colaborador.id }, critico: false,
          });
        } catch { /* */ }
        setReconhecidoSafe({ colaborador, score: match.score, dist: match.dist });
        setFase("bloqueio_rebatida");
        agendarReset(tempoMsgSucessoMs);
        return;
      }

      const { proximo } = await obterProximoEvento(colaborador.id);
      if (!proximo) {
        setReconhecidoSafe({ colaborador, score: match.score, dist: match.dist });
        setErroMsg(`${colaborador.nome.split(" ")[0]}, todos os pontos do dia já foram registrados.`);
        setFase("erro");
        agendarReset();
        return;
      }

      // Frame é OBRIGATÓRIO — sem ele nunca chamamos backend
      if (!frame?.blob) {
        setErroMsg("Não foi possível capturar a foto. Enquadre o rosto novamente.");
        setFase("erro");
        agendarReset();
        return;
      }

      tentativasFalhaRef.current = 0;
      const dadosReconhecido = {
        colaborador,
        score: match.score,
        dist: match.dist,
        proximo,
        frameBlob: frame.blob,
        frameUrl: frame.dataUrl,
      };
      setReconhecidoSafe(dadosReconhecido);

      const altaConfianca = autoRegistroAtivo && match.score >= scoreMinAuto;
      try {
        await registrarLog({
          modulo: "rh", acao: "outros", entidade: "Kiosk",
          descricao: `Reconhecimento OK: ${colaborador.nome} — ${altaConfianca ? "auto-registro" : "confirmação manual"}`,
          origem: "humano", loja_id: lojaIdRef.current,
          valor_novo: {
            dispositivo: deviceIdRef.current, colaborador_id: colaborador.id,
            score: match.score, dist: match.dist, proximo,
            score_min_auto: scoreMinAuto, alta_confianca: altaConfianca,
          },
          critico: false,
        });
      } catch { /* */ }

      if (altaConfianca) {
        await executarRegistroKiosk(dadosReconhecido);
      } else {
        setFase("reconhecido");
      }
    } catch (e) {
      setErroMsg(e?.message || "Erro inesperado");
      setFase("erro");
      agendarReset();
    } finally {
      processandoRef.current = false;
    }
  };

  // Confirmação manual (baixa confiança) — usa o MESMO executor, lendo do ref
  const confirmarPonto = () => executarRegistroKiosk(reconhecidoRef.current);

  const naoSouEu = async () => {
    try {
      await registrarLog({
        modulo: "rh", acao: "outros", entidade: "Kiosk",
        descricao: `Usuário negou identidade (kiosk_auto): ${reconhecidoRef.current?.colaborador?.nome}`,
        origem: "humano", loja_id: lojaIdRef.current,
        valor_novo: { dispositivo: deviceIdRef.current, colaborador_id: reconhecidoRef.current?.colaborador?.id }, critico: false,
      });
    } catch { /* */ }
    setReconhecidoSafe(null);
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
      const colaborador = await identificarColaboradorPorPin(pin, lojaIdRef.current);
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
        dispositivo: deviceIdRef.current,
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

  // Em modo de confirmação OU PIN, vertical: câmera reduzida + painel fixo no rodapé
  const confirmandoVertical = fase === "reconhecido" || fase === "fallback_pin";

  return (
    <div className="flex-1 flex flex-col landscape:flex-row items-stretch w-full min-h-0 relative">
      {/* Câmera — em vertical, quando confirmando, fica limitada a 45dvh para liberar espaço ao painel */}
      <div
        className="relative bg-black overflow-hidden landscape:flex-1 portrait:w-full shrink-0"
        style={{
          minHeight: confirmandoVertical ? "auto" : "min(60vh, 720px)",
          maxHeight: confirmandoVertical ? "45dvh" : undefined,
          height: confirmandoVertical ? "45dvh" : undefined,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-[42%] border-[3px] border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
            style={{
              width: "clamp(220px, 40vmin, 480px)",
              height: "clamp(290px, 54vmin, 620px)",
            }}
          />
        </div>
        {(fase === "aguardando_rosto" || fase === "nao_reconhecido" || fase === "processando_reconhecimento") && (
          <div className="absolute inset-x-0 bottom-6 text-center text-white text-base sm:text-lg font-medium drop-shadow-lg pointer-events-none">
            Enquadre seu rosto aqui
          </div>
        )}
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur">
          <span className={`w-2.5 h-2.5 rounded-full ${fase === "aguardando_rosto" || fase === "nao_reconhecido" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {labelFase(fase)}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Painel —
          - landscape: lateral fixa à direita
          - portrait normal: ocupa o resto da altura
          - portrait CONFIRMANDO: conteúdo scroll + botões fixos no rodapé (sempre visíveis) */}
      <div className="bg-slate-900 text-white flex flex-col landscape:w-[clamp(360px,32vw,460px)] portrait:w-full flex-1 min-h-0 overflow-hidden">
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

  // Confirmação manual: layout COMPACTO com botões sempre visíveis
  if (fase === "reconhecido" && reconhecido) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Conteúdo (rolável se necessário) */}
        <div className="flex-1 overflow-auto px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <div className="text-[11px] uppercase tracking-widest text-amber-400 mb-1.5">Confiança baixa — confirme</div>
          <div className="text-2xl sm:text-3xl font-semibold leading-tight mb-1">Parece ser {reconhecido.colaborador.nome}</div>
          <div className="text-xs text-slate-400 mb-3">Confiança: {(reconhecido.score * 100).toFixed(0)}%</div>
          <div className="bg-slate-800 rounded-lg px-4 py-3">
            <div className="text-[11px] text-slate-400 mb-0.5">Próximo ponto</div>
            <div className="text-xl sm:text-2xl font-semibold">{TIPO_LABEL[reconhecido.proximo] || reconhecido.proximo}</div>
          </div>
        </div>
        {/* Rodapé sticky com os botões — SEMPRE visível */}
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-5 py-3 sm:px-6 sm:py-4 space-y-2">
          <button
            onClick={onConfirmar}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 rounded-md font-semibold text-base sm:text-lg"
            style={{ minHeight: 56 }}
          >
            Confirmar ponto
          </button>
          <button
            onClick={onNaoSouEu}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-sm"
            style={{ minHeight: 44 }}
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
        {reconhecido?.colaborador && (
          <div className="text-emerald-400 text-sm uppercase tracking-widest mb-2">
            {reconhecido.colaborador.nome.split(" ")[0]} reconhecido
          </div>
        )}
        <Loader2 className="w-12 h-12 animate-spin text-slate-300 mb-4" />
        <div className="text-xl font-medium text-center">{statusMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "sucesso" && resultado) {
    return (
      <CenteredCol>
        <CheckCircle2 className="w-24 h-24 text-emerald-400 mb-4" />
        <div className="text-3xl font-semibold mb-1 text-center">Olá, {resultado.colaborador.nome.split(" ")[0]}!</div>
        <div className="text-emerald-300 text-lg font-medium mb-1">
          {TIPO_LABEL[resultado.tipo] || resultado.tipo} registrada
        </div>
        <div className="text-slate-400 text-sm">Próximo colaborador pode se aproximar</div>
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
        <div className="text-sm text-slate-400 text-center px-4">{erroMsg}</div>
      </CenteredCol>
    );
  }

  if (fase === "fallback_pin") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <KeyRound className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Modo PIN</span>
          </div>
          <div className="text-2xl font-semibold mb-2">Não conseguimos te reconhecer</div>
          <div className="text-sm text-slate-400 mb-5">Digite seu PIN para registrar o ponto.</div>
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
        </div>
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-5 py-3 sm:px-6 sm:py-4 flex gap-2">
          <button
            onClick={onCancelarPin}
            className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-md text-sm"
            style={{ minHeight: 48 }}
          >
            Tentar facial
          </button>
          <button
            onClick={onValidarPin}
            className="flex-1 bg-white text-slate-900 rounded-md font-medium"
            style={{ minHeight: 48 }}
          >
            Confirmar
          </button>
        </div>
      </div>
    );
  }

  return <CenteredCol><div className="text-slate-400 px-4 text-center">{statusMsg}</div></CenteredCol>;
}

function CenteredCol({ children }) {
  return <div className="flex-1 flex flex-col items-center justify-center text-center p-6">{children}</div>;
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      {children}
    </div>
  );
}