import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ShieldAlert, Bot, User as UserIcon, Lock } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import LogDetalheDialog from "@/components/auditoria/LogDetalheDialog";

const MODULOS = ["cadastros","operacoes","vendas","financeiro","rh","rotinas","marketing","atendimento","gestao","ia","auditoria","outro"];

const ORIGEM_BADGE = {
  humano: { cor: "bg-slate-100 text-slate-700", icon: UserIcon, label: "Humano" },
  ia: { cor: "bg-violet-100 text-violet-700", icon: Bot, label: "IA" },
  sistema: { cor: "bg-blue-100 text-blue-700", icon: Lock, label: "Sistema" },
  integracao: { cor: "bg-cyan-100 text-cyan-700", icon: Lock, label: "Integração" },
};

export default function Auditoria() {
  const [me, setMe] = useState(null);
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [usuario, setUsuario] = useState("");
  const [modulo, setModulo] = useState("_all");
  const [origem, setOrigem] = useState("_all");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [apenasCriticos, setApenasCriticos] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
    base44.entities.LogAuditoria.list("-data_hora", 500)
      .then(setLogs)
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      if (modulo !== "_all" && l.modulo !== modulo) return false;
      if (origem !== "_all" && l.origem !== origem) return false;
      if (apenasCriticos && !l.critico) return false;
      if (usuario && !(l.usuario_email || "").toLowerCase().includes(usuario.toLowerCase())) return false;
      if (busca) {
        const txt = `${l.acao} ${l.entidade || ""} ${l.descricao || ""}`.toLowerCase();
        if (!txt.includes(busca.toLowerCase())) return false;
      }
      const d = l.data_hora?.slice(0, 10);
      if (de && d && d < de) return false;
      if (ate && d && d > ate) return false;
      return true;
    });
  }, [logs, busca, usuario, modulo, origem, de, ate, apenasCriticos]);

  if (me && me.role !== "admin") {
    return (
      <div>
        <PageHeader title="Auditoria e Segurança" />
        <Card className="p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <div className="font-medium">Acesso restrito</div>
          <div className="text-sm text-muted-foreground mt-1">Apenas o Admin Geral pode visualizar a trilha de auditoria.</div>
        </Card>
      </div>
    );
  }

  const totalCriticos = filtrados.filter((l) => l.critico).length;
  const totalIA = filtrados.filter((l) => l.origem === "ia").length;

  return (
    <div>
      <PageHeader
        title="Auditoria e Segurança"
        description="Trilha completa de ações sensíveis. Ações de IA são identificadas separadamente."
      />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Buscar</div>
            <Input placeholder="Ação, entidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Usuário (email)</div>
            <Input placeholder="email@..." value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Módulo</div>
            <Select value={modulo} onValueChange={setModulo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Origem</div>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas</SelectItem>
                <SelectItem value="humano">Humano</SelectItem>
                <SelectItem value="ia">IA</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
                <SelectItem value="integracao">Integração</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">De</div>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Até</div>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Switch id="crit" checked={apenasCriticos} onCheckedChange={setApenasCriticos} />
          <label htmlFor="crit" className="text-sm cursor-pointer">Apenas ações críticas</label>
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total de logs</div>
          <div className="text-xl font-semibold">{filtrados.length}</div>
        </Card>
        <Card className="p-3 border-amber-300">
          <div className="text-xs text-muted-foreground">Ações críticas</div>
          <div className="text-xl font-semibold text-amber-700">{totalCriticos}</div>
        </Card>
        <Card className="p-3 border-violet-300">
          <div className="text-xs text-muted-foreground">Ações de IA</div>
          <div className="text-xl font-semibold text-violet-700">{totalIA}</div>
        </Card>
      </div>

      {/* Tabela */}
      {carregando ? (
        <Card className="p-8 text-center text-sm">Carregando logs...</Card>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum log com esses filtros.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Crítico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((l) => {
                const O = ORIGEM_BADGE[l.origem] || ORIGEM_BADGE.humano;
                const Icon = O.icon;
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetalhe(l)}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {l.data_hora ? format(new Date(l.data_hora), "dd/MM HH:mm:ss") : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{l.usuario_nome || l.usuario_email || "-"}</TableCell>
                    <TableCell>
                      <Badge className={O.cor}>
                        <Icon className="w-3 h-3 mr-1" />
                        {O.label}{l.agent_chave ? ` · ${l.agent_chave}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{l.modulo}</Badge></TableCell>
                    <TableCell className="text-xs">{l.acao}</TableCell>
                    <TableCell className="text-xs">{l.entidade || "-"}</TableCell>
                    <TableCell>{l.critico ? <Badge className="bg-amber-100 text-amber-700">crítica</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <LogDetalheDialog log={detalhe} onOpenChange={(o) => !o && setDetalhe(null)} />
    </div>
  );
}