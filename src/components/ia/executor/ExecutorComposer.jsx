import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ImagePlus, X } from "lucide-react";

// Rodapé de composição: preview de anexos + textarea + botões anexar/enviar.
export default function ExecutorComposer({
  input, setInput, anexos, onAnexar, onRemoverAnexo,
  enviando, subindoAnexo, onEnviar, placeholder,
}) {
  const fileRef = useRef(null);
  const podeEnviar = (input.trim() || anexos.length > 0) && !enviando && !subindoAnexo;

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (podeEnviar) onEnviar();
    }
  };

  return (
    <div className="border-t bg-card p-2.5">
      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {anexos.map((a) => (
            <div key={a.url} className="relative">
              <img src={a.url} alt={a.name} className="w-14 h-14 object-cover rounded-lg border border-border" />
              <button
                type="button"
                onClick={() => onRemoverAnexo(a.url)}
                className="absolute -top-1.5 -right-1.5 bg-white border border-border rounded-full p-0.5 shadow-sm hover:bg-muted"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => { onAnexar(Array.from(e.target.files || [])); e.target.value = ""; }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => fileRef.current?.click()}
          disabled={enviando || subindoAnexo}
          title="Anexar cupom, nota ou comprovante"
        >
          {subindoAnexo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder={placeholder}
          className="resize-none min-h-[40px] max-h-32 rounded-2xl"
          disabled={enviando}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 rounded-full bg-violet-600 hover:bg-violet-700"
          onClick={onEnviar}
          disabled={!podeEnviar}
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}