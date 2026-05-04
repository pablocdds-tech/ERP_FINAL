import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/financeiro/PageShell";
import { base44 } from "@/api/base44Client";
import { calcularSaldoSocio, totaisSemana } from "@/lib/socio-empresa-service";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const fmt = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Linha({ label, valor, tone }) {
  const cls = tone === "neg" ? "text-rose-600" : tone === "pos" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`font-mono font-semibold ${cls}`}>{fmt(valor)}</div>
    </div>
  );
}

export default function PfPjResumo() {
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reco, setReco] = useState("");
  const [genIa, setGenIa] = useState(false);

  useEffect(() => {
    base44.entities.MovimentoSocio.list("-data", 1000).then((ms) => {
      setMovs(ms); setLoading(false);
    });
  }, []);

  const semana = totaisSemana(movs);
  const saldo = calcularSaldoSocio(movs);

  const gerarReco = async () => {
    setGenIa(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um consultor financeiro de pequenas empresas. Com base nos números da semana abaixo, dê uma recomendação curta (3 frases) e prática para o sócio organizar a mistura PF x PJ.

Período: ${semana.inicio} a ${semana.fim}
- Empresa usou da PF: ${fmt(semana.empresa_usou_pf)}
- Entrou na PF dinheiro da empresa: ${fmt(semana.entrou_pf_da_empresa)}
- Retiradas do sócio: ${fmt(semana.retiradas)}
- Despesas pessoais pagas pela empresa: ${fmt(semana.despesas_pessoais_pela_empresa)}
- Juros/encargos PF causados pela empresa: ${fmt(semana.juros_pf)}
- Aportes do sócio: ${fmt(semana.aportes)}
- Reembolsos ao sócio: ${fmt(semana.reembolsos)}
- Saldo Sócio x Empresa atual: ${fmt(saldo)} (${saldo >= 0 ? "empresa deve ao sócio" : "sócio deve à empresa"})

Seja direto, sem jargões.`,
      });
      setReco(typeof res === "string" ? res : (res?.output || JSON.stringify(res)));
    } catch (e) {
      toast.error("Falha ao gerar recomendação");
    } finally { setGenIa(false); }
  };

  return (
    <PageShell
      title="Resumo PF x PJ"
      description={`Período: ${semana.inicio} a ${semana.fim}`}
      actions={<Link to="/admin/financeiro/real/pf-pj"><Button variant="outline">Voltar ao painel</Button></Link>}
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Movimentação da semana</div>
            <Linha label="Empresa usou da PF" valor={semana.empresa_usou_pf} tone="neg" />
            <Linha label="Entrou na PF dinheiro da empresa" valor={semana.entrou_pf_da_empresa} />
            <Linha label="Retiradas do sócio" valor={semana.retiradas} tone="neg" />
            <Linha label="Despesas pessoais pagas pela empresa" valor={semana.despesas_pessoais_pela_empresa} tone="neg" />
            <Linha label="Juros / encargos PF causados pela empresa" valor={semana.juros_pf} tone="neg" />
            <Linha label="Aportes do sócio" valor={semana.aportes} tone="pos" />
            <Linha label="Reembolsos ao sócio" valor={semana.reembolsos} />
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Saldo atual</div>
            <Linha label="Sócio x Empresa" valor={saldo} tone={saldo >= 0 ? "pos" : "neg"} />
            <div className="text-xs text-muted-foreground mt-2">
              {saldo >= 0
                ? "A empresa está devendo ao sócio (sócio é credor)."
                : "O sócio está devendo à empresa (sócio é devedor)."}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-600" /> Recomendação da IA</div>
                <Button size="sm" variant="outline" onClick={gerarReco} disabled={genIa}>
                  {genIa ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                  Gerar
                </Button>
              </div>
              {reco ? (
                <div className="text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">{reco}</div>
              ) : (
                <div className="text-xs text-muted-foreground">Clique em "Gerar" para receber uma recomendação personalizada.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}