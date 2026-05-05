import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { gerarAFD, verificarIntegridade, baixarTexto } from "@/lib/afd-service";

export default function AfdActions() {
  const [lojas, setLojas] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("batida"); // "batida" | "principal"
  const hoje = new Date().toISOString().slice(0, 10);
  const [de, setDe] = useState(hoje.slice(0, 8) + "01");
  const [ate, setAte] = useState(hoje);

  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [integridade, setIntegridade] = useState(null);

  useEffect(() => {
    base44.entities.Loja.list().then((l) => setLojas(l || []));
  }, []);

  const exportar = async () => {
    setCarregando(true);
    setResultado(null);
    try {
      const r = await gerarAFD({ loja_id: lojaId || null, dataInicio: de, dataFim: ate, filtro_loja: filtroLoja });
      baixarTexto(r.nome_arquivo, r.conteudo);
      setResultado(r);
    } finally {
      setCarregando(false);
    }
  };

  const verificar = async () => {
    setCarregando(true);
    setIntegridade(null);
    try {
      const r = await verificarIntegridade(lojaId || null);
      setIntegridade(r);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Exportação AFD & Integridade</h3>
        <Badge variant="outline" className="text-[10px]">Portaria 671-like</Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-3 flex-wrap">
        <Select value={lojaId} onValueChange={setLojaId}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="Todas as lojas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todas as lojas</SelectItem>
            {lojas.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroLoja} onValueChange={setFiltroLoja} disabled={!lojaId}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Critério da loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="batida">Loja onde foi batido</SelectItem>
            <SelectItem value="principal">Loja principal do colaborador</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="md:w-[170px]" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="md:w-[170px]" />

        <div className="flex gap-2 md:ml-auto">
          <Button variant="outline" size="sm" onClick={verificar} disabled={carregando}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verificar integridade
          </Button>
          <Button size="sm" onClick={exportar} disabled={carregando}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar AFD
          </Button>
        </div>
      </div>

      {resultado && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            Arquivo <span className="font-mono">{resultado.nome_arquivo}</span> gerado com {resultado.total} registros.
            <div className="text-emerald-700 mt-1 font-mono text-[10px] break-all">hash_total: {resultado.hash_total}</div>
          </div>
        </div>
      )}

      {integridade && (
        <div
          className={`text-xs rounded-md p-3 flex items-start gap-2 border ${
            integridade.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"
          }`}
        >
          {integridade.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            {integridade.ok ? (
              <span>Cadeia íntegra. Todos os {integridade.total} registros conferem.</span>
            ) : (
              <>
                <div className="font-semibold text-amber-900 mb-1">
                  {integridade.quebrados.length} inconsistência(s) em {integridade.total} registros:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 max-h-32 overflow-auto">
                  {integridade.quebrados.slice(0, 20).map((q, i) => (
                    <li key={i}>NSR {q.nsr}: {q.motivo}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground mt-2">
        Formato inspirado na Portaria 671/2021 com cadeia SHA-256 (não substitui REP-P homologado com assinatura ICP-Brasil).
      </div>
    </Card>
  );
}