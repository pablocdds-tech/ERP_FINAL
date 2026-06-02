import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import CameraCapture from "@/components/ponto/CameraCapture";
import { uploadFotoBlob, salvarCadastroFacial, salvarTemplateBiometrico } from "@/lib/ponto-service";
import { descritorDeUrl, mediaDescritores, hashTemplate, MODEL_VERSION } from "@/lib/biometria";

const POSES = [
  { key: "frontal", label: "Frontal", hint: "Olhe direto para a câmera" },
  { key: "esquerda", label: "Levemente à esquerda", hint: "Vire um pouco o rosto à esquerda" },
  { key: "direita", label: "Levemente à direita", hint: "Vire um pouco o rosto à direita" },
];

export default function AutoCadastroFacial() {
  const params = new URLSearchParams(window.location.search);
  const colaboradorId = params.get("c");

  const [colaborador, setColaborador] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [fotos, setFotos] = useState({ frontal: null, esquerda: null, direita: null });
  const [posing, setPosing] = useState(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    (async () => {
      if (!colaboradorId) { setErroCarga("Link inválido."); setCarregando(false); return; }
      try {
        const list = await base44.entities.Colaborador.filter({ id: colaboradorId });
        const c = list[0];
        if (!c) { setErroCarga("Colaborador não encontrado."); }
        else {
          setColaborador(c);
          setFotos({
            frontal: c.facial_frontal_url || null,
            esquerda: c.facial_esquerda_url || null,
            direita: c.facial_direita_url || null,
          });
          if (c.facial_status === "cadastrada") setConcluido(true);
        }
      } catch {
        setErroCarga("Não foi possível carregar. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [colaboradorId]);

  const handleCapture = async (blob) => {
    const pose = posing;
    setPosing(null);
    setSalvandoFoto(true);
    setErro(null);
    try {
      const url = await uploadFotoBlob(blob, `facial-${pose}.jpg`);
      await salvarCadastroFacial(colaborador.id, { [`${pose}_url`]: url });
      setFotos((f) => ({ ...f, [pose]: url }));
    } catch {
      setErro("Falha ao enviar a foto. Verifique a conexão e tente de novo.");
    } finally {
      setSalvandoFoto(false);
    }
  };

  const finalizar = async () => {
    if (!fotos.frontal) { setErro("Capture ao menos a foto frontal."); return; }
    setFinalizando(true);
    setErro(null);
    try {
      const urls = [fotos.frontal, fotos.esquerda, fotos.direita].filter(Boolean);
      const descritores = [];
      for (const url of urls) {
        const d = await descritorDeUrl(url);
        if (d?.descriptor) descritores.push(d.descriptor);
      }
      if (!descritores.length) {
        setErro("Nenhum rosto detectado nas fotos. Refaça as capturas com boa iluminação.");
        setFinalizando(false);
        return;
      }
      const media = mediaDescritores(descritores);
      const hash = await hashTemplate(media);
      await salvarTemplateBiometrico(colaborador.id, {
        descriptor: media, hash, versao: MODEL_VERSION, consentir: true,
      });
      setConcluido(true);
    } catch (e) {
      setErro("Falha ao finalizar: " + (e?.message || "erro"));
    } finally {
      setFinalizando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <div className="text-sm font-medium text-slate-800">{erroCarga}</div>
        <div className="text-xs text-slate-500 mt-1">Solicite um novo link ao seu gestor.</div>
      </div>
    );
  }

  if (concluido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
        <div className="text-lg font-semibold text-slate-800">Cadastro facial concluído!</div>
        <div className="text-sm text-slate-500 mt-1">Obrigado, {colaborador?.nome?.split(" ")[0]}. Já pode fechar esta página.</div>
      </div>
    );
  }

  const minimoOk = !!fotos.frontal;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Cadastro Facial</h1>
          <p className="text-sm text-slate-500 mt-1">Olá, {colaborador?.nome}. Tire 3 fotos do seu rosto para liberar a batida de ponto.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {POSES.map((p) => (
            <div key={p.key} className="space-y-1.5">
              <div className="aspect-square rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                {fotos[p.key] ? (
                  <img src={fotos[p.key]} alt={p.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-400 text-center px-2">Sem foto</span>
                )}
              </div>
              <Button
                type="button"
                variant={fotos[p.key] ? "outline" : "default"}
                size="sm"
                className="w-full text-xs h-8"
                disabled={salvandoFoto}
                onClick={() => setPosing(p.key)}
              >
                {fotos[p.key] ? "Refazer" : "Capturar"}
              </Button>
              <div className="text-[10px] text-slate-500 text-center leading-tight">{p.label}</div>
            </div>
          ))}
        </div>

        {salvandoFoto && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando foto…
          </div>
        )}

        {erro && (
          <div className="flex items-start gap-2 text-[12px] text-red-600 mb-3 bg-red-50 border border-red-100 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!minimoOk || finalizando || salvandoFoto}
          onClick={finalizar}
        >
          {finalizando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizando…</> : "Finalizar cadastro"}
        </Button>
        <p className="text-[11px] text-slate-400 text-center mt-3">
          As fotos são usadas apenas para reconhecimento no ponto. Capture em local bem iluminado.
        </p>

        {posing && (
          <CameraCapture
            hint={POSES.find((p) => p.key === posing)?.hint || "Enquadre o rosto"}
            onCancel={() => setPosing(null)}
            onCapture={handleCapture}
          />
        )}
      </div>
    </div>
  );
}