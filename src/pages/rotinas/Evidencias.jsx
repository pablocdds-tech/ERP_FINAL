import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import PageShell from "@/components/rotinas/PageShell";

// Galeria unificada de evidências (fotos vindas de chamados, ocorrências e OS).
export default function Evidencias() {
  const [origem, setOrigem] = useState("todas");
  const [chamados, setChamados] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [oss, setOss] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Chamado.list("-created_date", 200),
      base44.entities.OcorrenciaOperacional.list("-created_date", 200),
      base44.entities.OrdemServico.list("-created_date", 200),
    ]).then(([c, o, s]) => { setChamados(c); setOcorrencias(o); setOss(s); });
  }, []);

  const evidencias = [];
  if (origem === "todas" || origem === "chamados") {
    chamados.forEach((c) => (c.fotos || []).forEach((url) => evidencias.push({
      url, data: c.created_date, titulo: c.titulo, origem: "Chamado",
    })));
  }
  if (origem === "todas" || origem === "ocorrencias") {
    ocorrencias.forEach((o) => (o.fotos || []).forEach((url) => evidencias.push({
      url, data: o.created_date, titulo: o.titulo, origem: "Ocorrência",
    })));
  }
  if (origem === "todas" || origem === "os") {
    oss.forEach((s) => {
      (s.fotos_antes || []).forEach((url) => evidencias.push({
        url, data: s.data_abertura || s.created_date, titulo: `${s.titulo} (antes)`, origem: "OS",
      }));
      (s.fotos_depois || []).forEach((url) => evidencias.push({
        url, data: s.data_conclusao || s.created_date, titulo: `${s.titulo} (depois)`, origem: "OS",
      }));
    });
  }
  evidencias.sort((a, b) => new Date(b.data) - new Date(a.data));

  return (
    <PageShell
      title="Evidências"
      description="Galeria de fotos das execuções operacionais."
    >
      <Card className="p-4 mb-4">
        <Select value={origem} onValueChange={setOrigem}>
          <SelectTrigger className="w-full md:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            <SelectItem value="chamados">Chamados</SelectItem>
            <SelectItem value="ocorrencias">Ocorrências</SelectItem>
            <SelectItem value="os">Ordens de Serviço</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {evidencias.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nenhuma evidência ainda.</Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {evidencias.map((e, i) => (
            <a key={i} href={e.url} target="_blank" rel="noreferrer" className="block group">
              <div className="aspect-square rounded-lg overflow-hidden border border-border">
                <img src={e.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground truncate">{e.origem} • {e.data ? format(new Date(e.data), "dd/MM/yy") : ""}</div>
              <div className="text-xs font-medium truncate">{e.titulo}</div>
            </a>
          ))}
        </div>
      )}
    </PageShell>
  );
}