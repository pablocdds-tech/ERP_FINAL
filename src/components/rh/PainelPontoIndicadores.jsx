import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, KeyRound, Eye, UserX, Clock, LogOut } from "lucide-react";
import { diagnosticoDia } from "@/lib/rh-service";
import { hojeLocal } from "@/lib/utils";

/**
 * Painel de indicadores de Ponto Eletrônico (gestor).
 *
 * Reflete o fluxo correto:
 *  - Pontos NORMAIS são aprovados automaticamente (status = "registrado").
 *    O gestor NÃO precisa aprovar manualmente.
 *  - O gestor revisa apenas EXCEÇÕES (status = "pendente_revisao").
 *
 * Indicadores exibidos:
 *  - Registrados automaticamente (no dia)
 *  - Pendentes de revisão (exceções a revisar)
 *  - Por PIN (fallback)
 *  - Baixa confiança facial
 *  - Atrasados
 *  - Sem bateu saída
 *  - Ausentes (escalados que não bateram entrada)
 *
 * Props:
 *   data (YYYY-MM-DD) — data alvo (default: hoje)
 *   loja_id (opcional) — filtra por loja
 *   compact (bool) — versão reduzida para PWA
 */
export default function PainelPontoIndicadores({ data, loja_id, compact = false }) {
  const dataAlvo = data || hojeLocal();
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCarregando(true);
      const filtro = { data: dataAlvo };
      if (loja_id) filtro.loja_id = loja_id;
      const [r, e] = await Promise.all([
        base44.entities.RegistroPonto.filter(filtro, "-horario", 2000),
        base44.entities.Escala.filter(loja_id ? { data: dataAlvo, loja_id } : { data: dataAlvo }, "-data", 2000),
      ]);
      if (cancel) return;
      setRegistros(r); setEscalas(e); setCarregando(false);
    })();
    return () => { cancel = true; };
  }, [dataAlvo, loja_id]);

  const indicadores = useMemo(() => {
    const ativos = registros.filter((r) => r.status !== "rejeitado");
    const auto = ativos.filter((r) => r.status === "registrado").length;
    const pendentes = ativos.filter((r) => r.status === "pendente_revisao");
    const pin = ativos.filter((r) => r.fallback_pin).length;
    const baixaConf = ativos.filter((r) => r.ia_resultado === "baixa_confianca").length;

    // Atrasados / sem saída / ausentes — usam escalas + registros.
    // Deduplica por colaborador para não contar a mesma pessoa em escalas duplicadas.
    let atrasados = 0;
    let semSaida = 0;
    let ausentes = 0;
    const vistos = new Set();
    for (const e of escalas) {
      if (e.tipo !== "normal") continue;
      if (vistos.has(e.colaborador_id)) continue;
      vistos.add(e.colaborador_id);
      const regsCol = ativos.filter((r) => r.colaborador_id === e.colaborador_id);
      const diag = diagnosticoDia(e, regsCol);
      if (diag.status === "atraso") atrasados++;
      if (diag.status === "falta") ausentes++;
      const teveEntrada = regsCol.some((r) => r.tipo === "entrada");
      const teveSaida = regsCol.some((r) => r.tipo === "saida");
      if (teveEntrada && !teveSaida) semSaida++;
    }

    return {
      auto,
      pendentes: pendentes.length,
      pin,
      baixaConf,
      atrasados,
      semSaida,
      ausentes,
    };
  }, [registros, escalas]);

  const cards = [
    { key: "auto", label: "Registrados automaticamente", value: indicadores.auto, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { key: "pendentes", label: "Pendentes de revisão", value: indicadores.pendentes, icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    { key: "pin", label: "Por PIN", value: indicadores.pin, icon: KeyRound, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
    { key: "baixa", label: "Baixa confiança facial", value: indicadores.baixaConf, icon: Eye, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    { key: "atrasados", label: "Atrasados", value: indicadores.atrasados, icon: Clock, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    { key: "semSaida", label: "Sem bater saída", value: indicadores.semSaida, icon: LogOut, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    { key: "ausentes", label: "Ausentes", value: indicadores.ausentes, icon: UserX, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-7"}`}>
      {cards.map((c) => (
        <Card key={c.key} className={`p-3 border ${c.border} ${c.bg}`}>
          <div className="flex items-center gap-2">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground leading-tight">{c.label}</div>
          </div>
          <div className={`mt-1 text-2xl font-semibold ${c.color}`}>{carregando ? "—" : c.value}</div>
        </Card>
      ))}
    </div>
  );
}