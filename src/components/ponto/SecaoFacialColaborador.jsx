import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, AlertCircle, Fingerprint } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { uploadFotoBlob, salvarCadastroFacial, salvarTemplateBiometrico } from "@/lib/ponto-service";
import { descritorDeUrl, mediaDescritores, hashTemplate, MODEL_VERSION } from "@/lib/biometria";

const STATUS_LABEL = {
  nao_cadastrada: { label: "Não cadastrada", variant: "outline", color: "text-muted-foreground" },
  cadastrada: { label: "Cadastrada", variant: "default", color: "text-emerald-700" },
  pendente_revisao: { label: "Pendente revisão", variant: "secondary", color: "text-amber-700" },
  bloqueada: { label: "Bloqueada", variant: "destructive", color: "text-red-700" },
};

const POSES = [
  { key: "frontal", label: "Frontal", hint: "Olhe direto para a câmera" },
  { key: "esquerda", label: "Levemente à esquerda", hint: "Vire um pouco o rosto à esquerda" },
  { key: "direita", label: "Levemente à direita", hint: "Vire um pouco o rosto à direita" },
];

export default function SecaoFacialColaborador({ colaborador, onUpdated, disabled }) {
  const [posing, setPosing] = useState(null); // "frontal" | "esquerda" | "direita"
  const [saving, setSaving] = useState(false);
  const [gerandoTemplate, setGerandoTemplate] = useState(false);
  const [templateMsg, setTemplateMsg] = useState(null);

  const status = colaborador?.facial_status || "nao_cadastrada";
  const meta = STATUS_LABEL[status] || STATUS_LABEL.nao_cadastrada;

  const fotos = {
    frontal: colaborador?.facial_frontal_url,
    esquerda: colaborador?.facial_esquerda_url,
    direita: colaborador?.facial_direita_url,
  };

  const handleCapture = async (blob) => {
    const pose = posing;
    setPosing(null);
    setSaving(true);
    try {
      const url = await uploadFotoBlob(blob, `facial-${pose}.jpg`);
      await salvarCadastroFacial(colaborador.id, { [`${pose}_url`]: url });
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const gerarTemplate = async () => {
    if (!fotos.frontal) {
      setTemplateMsg({ ok: false, msg: "É necessário ter ao menos a foto frontal." });
      return;
    }
    setGerandoTemplate(true);
    setTemplateMsg(null);
    try {
      const urls = [fotos.frontal, fotos.esquerda, fotos.direita].filter(Boolean);
      const descritores = [];
      for (const url of urls) {
        const d = await descritorDeUrl(url);
        if (d?.descriptor) descritores.push(d.descriptor);
      }
      if (!descritores.length) {
        setTemplateMsg({ ok: false, msg: "Nenhum rosto detectado nas fotos. Refaça as capturas." });
        setGerandoTemplate(false);
        return;
      }
      const media = mediaDescritores(descritores);
      const hash = await hashTemplate(media);
      await salvarTemplateBiometrico(colaborador.id, {
        descriptor: media,
        hash,
        versao: MODEL_VERSION,
        consentir: true,
      });
      setTemplateMsg({ ok: true, msg: `Template biométrico gerado a partir de ${descritores.length} foto(s).` });
      onUpdated?.();
    } catch (e) {
      setTemplateMsg({ ok: false, msg: "Falha ao gerar template: " + (e?.message || "erro") });
    } finally {
      setGerandoTemplate(false);
    }
  };

  if (!colaborador?.id) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        Salve o colaborador primeiro para cadastrar a facial.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Cadastro Facial</span>
          <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {POSES.map((p) => (
          <div key={p.key} className="space-y-1.5">
            <div className="aspect-square rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
              {fotos[p.key] ? (
                <img src={fotos[p.key]} alt={p.label} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[10px] text-muted-foreground text-center px-2">
                  Sem foto
                </div>
              )}
            </div>
            <Button
              type="button"
              variant={fotos[p.key] ? "outline" : "default"}
              size="sm"
              className="w-full text-xs h-8"
              disabled={disabled || saving}
              onClick={() => setPosing(p.key)}
            >
              {fotos[p.key] ? "Refazer" : "Capturar"}
            </Button>
            <div className="text-[10px] text-muted-foreground text-center">{p.label}</div>
          </div>
        ))}
      </div>

      {status === "cadastrada" ? (
        <div className="flex items-start gap-2 text-[11px] text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>Facial cadastrada. Recadastrar gera nova auditoria.</div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-[11px] text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>Capture pelo menos a foto frontal para liberar o ponto facial.</div>
        </div>
      )}

      <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Template biométrico (128-d)</span>
          </div>
          {colaborador.biometria_hash ? (
            <Badge variant="default" className="text-[10px]">Gerado</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Não gerado</Badge>
          )}
        </div>
        {colaborador.biometria_hash && (
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            hash: {colaborador.biometria_hash.slice(0, 24)}… · {colaborador.biometria_versao}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full text-xs h-8"
          disabled={disabled || gerandoTemplate || !fotos.frontal}
          onClick={gerarTemplate}
        >
          {gerandoTemplate ? "Gerando…" : colaborador.biometria_hash ? "Regerar template" : "Gerar template biométrico"}
        </Button>
        {templateMsg && (
          <div className={`text-[11px] ${templateMsg.ok ? "text-emerald-700" : "text-amber-700"}`}>{templateMsg.msg}</div>
        )}
        <div className="text-[10px] text-muted-foreground">
          O template é um vetor numérico extraído das fotos — não é a imagem em si. Usado para reconhecimento offline e auditoria.
        </div>
      </div>

      {posing && (
        <CameraCapture
          hint={POSES.find((p) => p.key === posing)?.hint || "Enquadre o rosto"}
          onCancel={() => setPosing(null)}
          onCapture={handleCapture}
        />
      )}
    </div>
  );
}