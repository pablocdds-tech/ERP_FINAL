import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, FileText, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { gerarAFD, verificarIntegridade, baixarTexto } from "@/lib/afd-service";
import { verificarPendenciasCadastraisPeriodo } from "@/lib/afd-pre-check";

export default function AfdActions() {
  const [lojas, setLojas] = useState([]);
  const [lojaId, setLojaId] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("batida");
  const hoje = new Date().toISOString().slice(0, 10);
  const [de, setDe] = useState(hoje.slice(0, 8) + "01");
  const [ate, setAte] = useState(hoje);

  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [integridade, setIntegridade] = useState(null);
  const [bloqueio, setBloqueio] = useState(null); // { pendencias }
  const [pendChecadas, setPendChecadas] = useState(null); // resultado do botão "Checar pendências"

  useEffect(() => {
    base44.entities.Loja.list().then((l) => setLojas(l || []));
  }, []);

  const limparAvisos = () => { setResultado(null); setBloqueio(null); setPendChecadas(null); };

  const checarPendencias = async () => {
    setCarregando(true);
    limparAvisos();
    try {
      const r = await verificarPendenciasCadastraisPeriodo({
        dataInicio: de, dataFim: ate, loja_id: lojaId || null, filtro_loja: filtroLoja,
      });
      setPendChecadas(r);
    } finally { setCarregando(false); }
  };

  const exportar = async (modo = "oficial") => {
    setCarregando(true);
    limparAvisos();
    try {
      const r = await gerarAFD({
        loja_id: lojaId || null, dataInicio: de, dataFim: ate,
        filtro_loja: filtroLoja, modo,
      });
      if (r.bloqueado) {
        setBloqueio({ pendencias: r.pendencias });
        return;
      }
      baixarTexto(r.nome_arquivo, r.conteudo);
      setResultado(r);
    } finally { setCarregando(false); }
  };

  const verificar = async () => {
    setCarregando(true);
    setIntegridade(null);
    try {
      const r = await verificarIntegridade(lojaId || null);
      setIntegridade(r);
    } finally { setCarregando(false); }
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

        <div className="flex gap-2 md:ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={checarPendencias} disabled={carregando}>
            <FileWarning className="w-3.5 h-3.5 mr-1" /> Checar pendências
          </Button>
          <Button variant="outline" size="sm" onClick={verificar} disabled={carregando}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verificar integridade
          </Button>
          <Button size="sm" onClick={() => exportar("oficial")} disabled={carregando}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar AFD oficial
          </Button>
        </div>
      </div>

      {pendChecadas && (
        <div className={`text-xs rounded-md p-3 border mb-2 ${pendChecadas.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"}`}>
          {pendChecadas.ok ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>Sem pendências cadastrais no período. {pendChecadas.total_colaboradores} colaborador(es) com batidas conferidos.</span>
            </div>
          ) : (
            <ListaPendencias pendencias={pendChecadas.pendencias} />
          )}
        </div>
      )}

      {bloqueio && (
        <div className="text-xs rounded-md p-3 border bg-amber-50 border-amber-300 mb-2">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900 mb-0.5">
                Exportação OFICIAL bloqueada — {bloqueio.pendencias.length} colaborador(es) com pendência cadastral.
              </div>
              <div className="text-amber-800">
                Corrija nome e CPF antes de exportar para o contador. Você pode gerar um RASCUNHO com aviso explícito apenas para diagnóstico.
              </div>
            </div>
          </div>
          <ListaPendencias pendencias={bloqueio.pendencias} />
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => exportar("rascunho")} disabled={carregando}>
              Gerar rascunho (uso interno)
            </Button>
          </div>
        </div>
      )}

      {resultado && (
        <div className={`text-xs rounded-md p-3 flex items-start gap-2 border ${resultado.modo === "rascunho" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          {resultado.modo === "rascunho"
            ? <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
          <div>
            {resultado.modo === "rascunho" && (
              <div className="font-semibold text-amber-900 mb-0.5">⚠ Arquivo de RASCUNHO — não envie ao contador.</div>
            )}
            Arquivo <span className="font-mono">{resultado.nome_arquivo}</span> gerado com {resultado.total} registros.
            <div className={`mt-1 font-mono text-[10px] break-all ${resultado.modo === "rascunho" ? "text-amber-700" : "text-emerald-700"}`}>
              hash_total: {resultado.hash_total}
            </div>
          </div>
        </div>
      )}

      {integridade && (
        <div className={`text-xs rounded-md p-3 flex items-start gap-2 border mt-2 ${integridade.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"}`}>
          {integridade.ok
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />}
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

function ListaPendencias({ pendencias }) {
  return (
    <div>
      <div className="font-semibold text-amber-900 mb-1">{pendencias.length} colaborador(es) com problema:</div>
      <div className="max-h-40 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="text-amber-900">
            <tr className="text-left">
              <th className="py-1 pr-2">Colaborador</th>
              <th className="py-1 pr-2">Loja</th>
              <th className="py-1">Problema</th>
            </tr>
          </thead>
          <tbody>
            {pendencias.slice(0, 50).map((p) => (
              <tr key={p.colaborador_id} className="border-t border-amber-200">
                <td className="py-1 pr-2">{p.nome}</td>
                <td className="py-1 pr-2">{p.loja}</td>
                <td className="py-1">{p.problemas.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pendencias.length > 50 && (
          <div className="text-[10px] text-amber-800 mt-1">+ {pendencias.length - 50} colaborador(es)…</div>
        )}
      </div>
    </div>
  );
}