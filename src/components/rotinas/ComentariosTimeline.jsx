import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Send, X, MessageSquare, Bot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { listarComentarios, adicionarComentario } from "@/lib/rotinas-service";
import { format } from "date-fns";

// Timeline de comentários acoplada a uma entidade (Tarefa, Chamado, Ocorrência, OS, ChecklistExecucao).
export default function ComentariosTimeline({ entidade, entidade_id, compact = false }) {
  const [items, setItems] = useState([]);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setItems(await listarComentarios(entidade, entidade_id));
  }, [entidade, entidade_id]);

  useEffect(() => { if (entidade_id) load(); }, [entidade_id, load]);

  const anexar = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFotos((arr) => [...arr, file_url]);
      setUploading(false);
    };
    input.click();
  };

  const enviar = async () => {
    if (!texto.trim() && fotos.length === 0) return;
    setSaving(true);
    await adicionarComentario({ entidade, entidade_id, texto: texto.trim() || "(anexo)", fotos });
    setTexto(""); setFotos([]);
    await load();
    setSaving(false);
  };

  return (
    <div className={compact ? "" : "border-t border-border pt-3"}>
      {!compact && (
        <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Comentários ({items.length})
        </div>
      )}

      <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground py-3 text-center">Sem comentários ainda.</div>
        )}
        {items.map((c) => {
          const isSistema = c.tipo === "sistema";
          return (
            <div key={c.id} className={`text-xs rounded p-2 ${isSistema ? "bg-blue-50/60 border border-blue-100" : "bg-muted/40"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {isSistema && <Bot className="w-3 h-3 text-blue-600" />}
                <span className="font-medium">{c.autor_nome || c.autor_email || (isSistema ? "Sistema" : "—")}</span>
                <span className="text-muted-foreground ml-auto">
                  {c.created_date ? format(new Date(c.created_date), "dd/MM HH:mm") : ""}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{c.texto}</div>
              {(c.fotos || []).length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {c.fotos.map((f, i) => (
                    <a key={i} href={f} target="_blank" rel="noreferrer">
                      <img src={f} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escrever comentário..." />
        {fotos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                <img src={f} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                <button onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-background rounded-full border border-border p-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={anexar} disabled={uploading}>
            <Camera className="w-3.5 h-3.5 mr-1" /> {uploading ? "..." : "Foto"}
          </Button>
          <Button size="sm" onClick={enviar} disabled={saving || (!texto.trim() && fotos.length === 0)} className="ml-auto">
            <Send className="w-3.5 h-3.5 mr-1" /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}