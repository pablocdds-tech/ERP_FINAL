import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/rh/PageShell";
import PainelPontoIndicadores from "@/components/rh/PainelPontoIndicadores";
import PontoDoDiaTabela from "@/components/rh/PontoDoDiaTabela";
import { hojeLocal } from "@/lib/utils";

export default function PontoDoDia() {
  const hoje = hojeLocal();
  const [data, setData] = useState(hoje);
  const [lojaId, setLojaId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [lojas, setLojas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [escalas, setEscalas] = useState([]);

  const carregar = async () => {
    const filtroR = lojaId ? { data, loja_id: lojaId } : { data };
    const filtroE = lojaId ? { data, loja_id: lojaId } : { data };
    const [l, c, r, e] = await Promise.all([
      base44.entities.Loja.list(),
      base44.entities.Colaborador.filter({ status: "ativo" }),
      base44.entities.RegistroPonto.filter(filtroR, "-horario", 5000),
      base44.entities.Escala.filter(filtroE, "-data", 5000),
    ]);
    setLojas(l || []); setColaboradores(c || []); setRegistros(r || []); setEscalas(e || []);
  };
  useEffect(() => { carregar(); }, [data, lojaId]); // eslint-disable-line

  const colabsFiltrados = useMemo(
    () => (lojaId ? colaboradores.filter((c) => c.loja_id === lojaId) : colaboradores),
    [colaboradores, lojaId]
  );

  return (
    <PageShell title="Ponto do Dia" description="Quem está presente, ausente ou em atraso agora.">
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="md:w-[180px]" />
          <Select value={lojaId || "__all__"} onValueChange={(v) => setLojaId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as lojas</SelectItem>
              {lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="md:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="presente">Presente</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="em_intervalo">Em intervalo</SelectItem>
              <SelectItem value="sem_saida">Sem saída</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
              <SelectItem value="sem_jornada">Sem jornada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="mb-4">
        <PainelPontoIndicadores data={data} loja_id={lojaId || undefined} />
      </div>

      <Card className="overflow-hidden">
        <PontoDoDiaTabela
          data={data}
          colaboradores={colabsFiltrados}
          registros={registros}
          escalas={escalas}
          lojas={lojas}
          statusFiltro={statusFiltro}
        />
      </Card>
    </PageShell>
  );
}