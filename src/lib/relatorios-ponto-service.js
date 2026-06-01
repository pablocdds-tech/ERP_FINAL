/**
 * Service para relatórios de ponto.
 * Reaproveita o motor de cálculo já existente — nada de duplicar lógica.
 */
import { base44 } from "@/api/base44Client";
import { resumoDia, totalizarPeriodo } from "@/lib/ponto-calculo-service";
import { carregarConfigPonto } from "@/lib/ponto-config-service";

/** Carrega o universo necessário para gerar relatórios de um período. */
export async function carregarUniversoPonto({ data_inicio, data_fim, loja_id = "" }) {
  const [colaboradores, jornadas, feriados, config, registros, escalas, lojas, abonos] = await Promise.all([
    base44.entities.Colaborador.filter({ status: "ativo" }),
    base44.entities.JornadaTrabalho.filter({ ativo: true }).catch(() => []),
    base44.entities.Feriado.filter({ ativo: true }).catch(() => []),
    carregarConfigPonto().catch(() => ({})),
    base44.entities.RegistroPonto.list("-horario", 10000),
    base44.entities.Escala.list("-data", 10000),
    base44.entities.Loja.list(),
    base44.entities.SolicitacaoRH.filter({ status: "aprovada" }).catch(() => []),
  ]);

  const colabs = loja_id ? colaboradores.filter((c) => c.loja_id === loja_id) : colaboradores;
  const inPeriodo = (d) => d >= data_inicio && d <= data_fim;

  const linhas = colabs.map((colab) => {
    const regs = registros.filter((r) => r.colaborador_id === colab.id && inPeriodo(r.data));
    const esc = escalas.filter((e) => e.colaborador_id === colab.id && inPeriodo(e.data));
    const jornada = jornadas.find((j) => j.id === colab.jornada_id) || jornadas[0] || null;

    const map = new Map();
    for (const r of regs) {
      const cur = map.get(r.data) || { data: r.data, registros: [], escala: null };
      cur.registros.push(r); map.set(r.data, cur);
    }
    for (const e of esc) {
      const cur = map.get(e.data) || { data: e.data, registros: [], escala: null };
      cur.escala = e; map.set(e.data, cur);
    }
    const feriadoPorData = {};
    for (const f of feriados) {
      if (!feriadoPorData[f.data]) feriadoPorData[f.data] = f;
      else if (f.loja_id && colab.loja_id === f.loja_id) feriadoPorData[f.data] = f;
    }
    const dias = Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
    const resumos = dias.map((d) => resumoDia({
      dataISO: d.data, registros: d.registros, escalaDia: d.escala,
      jornada, feriadoDoDia: feriadoPorData[d.data] || null, config,
    }));
    const totais = totalizarPeriodo(resumos);
    const abonosDoColab = abonos.filter((a) => a.colaborador_id === colab.id && a.data_referencia && inPeriodo(a.data_referencia));
    return { colaborador: colab, resumos, totais, abonos: abonosDoColab };
  });

  return { linhas, lojas };
}