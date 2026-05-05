import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, X } from "lucide-react";

/**
 * Captura uma foto pela câmera frontal usando getUserMedia.
 * onCapture(blob, dataUrl) — chamado ao confirmar.
 * onCancel() — fechar sem capturar.
 * Hint controla a mensagem central exibida.
 */
export default function CameraCapture({ onCapture, onCancel, hint = "Enquadre o rosto", autoCaptureMs = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [erro, setErro] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setErro(e?.message || "Não foi possível acessar a câmera. Verifique a permissão.");
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-captura opcional após X ms (usado no Kiosk)
  useEffect(() => {
    if (!autoCaptureMs || erro || previewUrl) return;
    const t = setTimeout(() => capturar(), autoCaptureMs);
    return () => clearTimeout(t);
  }, [autoCaptureMs, erro, previewUrl]); // eslint-disable-line

  const capturar = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    const v = videoRef.current;
    const c = canvasRef.current;
    const w = v.videoWidth || 720;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setPreviewUrl(dataUrl);
    setCapturing(false);
  };

  const refazer = () => setPreviewUrl(null);

  const confirmar = async () => {
    if (!previewUrl || !canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onCapture?.(blob, previewUrl);
      },
      "image/jpeg",
      0.85
    );
  };

  if (erro) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white">
        <Camera className="w-10 h-10 mb-3 opacity-60" />
        <div className="text-sm font-medium mb-2">Câmera indisponível</div>
        <div className="text-xs opacity-70 text-center max-w-xs mb-4">{erro}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-3 right-3 z-10">
        <Button size="icon" variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {!previewUrl ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-[42%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  width: "clamp(220px, 42vmin, 480px)",
                  height: "clamp(290px, 56vmin, 620px)",
                }}
              />
            </div>
            <div className="absolute bottom-28 inset-x-0 text-center text-white text-sm font-medium">
              {hint}
            </div>
          </>
        ) : (
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="bg-black/90 px-6 py-5 flex items-center justify-center gap-4">
        {!previewUrl ? (
          <button
            onClick={capturar}
            disabled={capturing}
            className="w-16 h-16 rounded-full bg-white border-4 border-white/30 active:scale-95 transition-transform"
            aria-label="Capturar"
          />
        ) : (
          <>
            <Button variant="secondary" onClick={refazer}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Refazer
            </Button>
            <Button onClick={confirmar} className="px-6">Usar foto</Button>
          </>
        )}
      </div>
    </div>
  );
}