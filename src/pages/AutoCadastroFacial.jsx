import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CheckCircle2, AlertCircle, Loader2, IdCard } from "lucide-react";
import CameraCapture from "@/components/ponto/CameraCapture";
import { descritorDeUrl, mediaDescritores, hashTemplate, MODEL_VERSION } from "@/lib/biometria";

const POSES = [
  { key: "frontal", label: "Frontal", hint: "Olhe direto para a câmera" },
  { key: "esquerda", label: "À esquerda", hint: "Vire um pouco o rosto à esquerda" },
  { key: "direita", label: "À direita", hint: "Vire um pouco o rosto à direita" },
];

function formatCpf(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

async function uploadFotoBlob(blob, name) {
  const file = new File([blob], name, { type: blob.type || "image/jpeg" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

export default function AutoCadastroFacial() {
  const [cpf, setCpf] = useState("");
  const [etapa, setEtapa] = useState("cpf"); // cpf | fotos | ja_cadastrado | concluido
  const [colaborador, setColaborador] = useState(null); // { id, nome }
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState(null);

  const [fotos, setFotos] = useState({ frontal: null, esquerda: null, direita: null });
  const [posing, setPosing] = useState(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const verificarCpf = async () => {
    setErro(null);
    setVerificando(true);
    try {
      const res = await base44.functions.invoke("autoCadastroFacial", { action: "lookup", cpf });
      const d = res?.data || {};
      if (!d.ok) { setErro(d.motivo || "Não foi possível verificar."); return; }
      if (!d.encontrado) { setErro("CPF não encontrado. Confira ou fale com seu gestor."); return; }
      setColaborador({ id: d.colaborador_id, nome: d.nome });
      if (d.ja_cadastrado) setEtapa("ja_cadastrado");
      else setEtapa("fotos");
    } catch (e) {
      setErro("Erro ao verificar: " + (e?.message || "tente novamente"));
    } finally {
      setVerificando(false);
    }
  };

  const handleCapture = async (blob) => {
    const pose = posing;
    setPosing(null);
    setSalvandoFoto(true);
    setErro(null);
    try {
      const url = await uploadFotoBlob(blob, `facial-${pose}.jpg`);
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
        setErro("Nenhum rosto detectado. Refaça as capturas com boa iluminação.");
        setFinalizando(false);
        return;
      }
      const media = mediaDescritores(descritores);
      const hash = await hashTemplate(media);

      const res = await base44.functions.invoke("autoCadastroFacial", {
        action: "salvar",
        colaborador_id: colaborador.id,
        cpf,
        frontal_url: fotos.frontal,
        esquerda_url: fotos.esquerda,
        direita_url: fotos.direita,
        biometria_template: JSON.stringify(media),
        biometria_hash: hash,
        biometria_versao: MODEL_VERSION,
      });
      if (!res?.data?.ok) { setErro(res?.data?.motivo || "Falha ao finalizar."); setFinalizando(false); return; }
      setEtapa("concluido");
    } catch (e) {
      setErro("Falha ao finalizar: " + (e?.message || "erro"));
    } finally {
      setFinalizando(false);
    }
  };

  // Tela: já cadastrado
  if (etapa === "ja_cadastrado") {
    return (
      <Centralizado>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
        <div className="text-lg font-semibold text-slate-800">Você já tem cadastro facial ativo</div>
        <div className="text-sm text-slate-500 mt-1">
          {colaborador?.nome?.split(" ")[0]}, não é preciso cadastrar de novo. Já pode bater o ponto.
        </div>
      </Centralizado>
    );
  }

  // Tela: concluído
  if (etapa === "concluido") {
    return (
      <Centralizado>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
        <div className="text-lg font-semibold text-slate-800">Cadastro facial concluído!</div>
        <div className="text-sm text-slate-500 mt-1">
          Obrigado, {colaborador?.nome?.split(" ")[0]}. Já pode fechar esta página.
        </div>
      </Centralizado>
    );
  }

  // Tela: CPF
  if (etapa === "cpf") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white mb-3">
              <IdCard className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Cadastro Facial</h1>
            <p className="text-sm text-slate-500 mt-1">Digite seu CPF para começar.</p>
          </div>

          <Input
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={formatCpf(cpf)}
            onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
            className="text-center text-lg h-12 tracking-wider"
            onKeyDown={(e) => e.key === "Enter" && cpf.length === 11 && verificarCpf()}
          />

          {erro && (
            <div className="flex items-start gap-2 text-[12px] text-red-600 mt-3 bg-red-50 border border-red-100 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <Button className="w-full mt-4 h-11" disabled={cpf.length !== 11 || verificando} onClick={verificarCpf}>
            {verificando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando…</> : "Continuar"}
          </Button>
        </div>
      </div>
    );
  }

  // Tela: fotos
  const minimoOk = !!fotos.frontal;
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Cadastro Facial</h1>
          <p className="text-sm text-slate-500 mt-1">
            Olá, {colaborador?.nome}. Tire 3 fotos do seu rosto para liberar a batida de ponto.
          </p>
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

        <Button className="w-full" disabled={!minimoOk || finalizando || salvandoFoto} onClick={finalizar}>
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

function Centralizado({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      {children}
    </div>
  );
}