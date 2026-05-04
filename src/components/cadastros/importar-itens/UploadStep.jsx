import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { parseLinha } from "@/lib/itens-import-service";

// Esquema esperado das colunas da aba "Classificação ERP"
const SCHEMA = {
  type: "object",
  properties: {
    "ID": { type: "string" },
    "Produto": { type: "string" },
    "Quantidade": { type: "number" },
    "Unidade": { type: "string" },
    "Último preço": { type: "number" },
    "Preço médio": { type: "number" },
    "Estoque mínimo": { type: "number" },
    "Categorias": { type: "string" },
    "Ficha técnica?": { type: "string" },
    "Tipo sugerido ERP": { type: "string" },
    "Categoria sugerida ERP": { type: "string" },
    "Entra na ficha técnica?": { type: "string" },
    "Impacto gerencial": { type: "string" },
    "Grupo DRE sugerido": { type: "string" },
    "Prioridade": { type: "string" },
    "Ação recomendada": { type: "string" },
    "Observações": { type: "string" },
  },
};

export default function UploadStep({ onParsed }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: "array", items: SCHEMA },
      });
      if (result.status !== "success") {
        toast.error(`Erro ao ler planilha: ${result.details || "formato inválido"}`);
        return;
      }
      const linhas = (result.output || []).map(parseLinha);
      if (linhas.length === 0) {
        toast.error("Nenhuma linha encontrada na planilha.");
        return;
      }
      onParsed({ fileName: file.name, fileUrl: file_url, linhas });
    } catch (e) {
      toast.error("Falha ao processar a planilha.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Envie a planilha de itens</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Aceita .xlsx ou .csv. A leitura tenta a aba <strong>Classificação ERP</strong> primeiro;
            se não houver, usa a primeira aba.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {loading ? "Processando..." : "Selecionar planilha"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Colunas esperadas: Produto, Tipo sugerido ERP, Unidade, Categoria sugerida ERP, Quantidade,
          Preço médio, Estoque mínimo, Prioridade, Observações.
        </p>
      </div>
    </Card>
  );
}