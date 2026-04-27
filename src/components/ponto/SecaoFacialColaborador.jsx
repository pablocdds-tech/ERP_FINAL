import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, AlertCircle } from "lucide-react";
import CameraCapture from "./CameraCapture";
import { uploadFotoBlob, salvarCadastroFacial } from "@/lib/ponto-service";

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