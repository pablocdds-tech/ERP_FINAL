import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ArrowLeft, Database } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TIPOS_FILTRO = [
  { value: "todos", label: "Todos os tipos" },
  { value: "insumo_producao", label: "Insumos de produção" },
  { value: "embalagem", label: "Embalagens" },
  { value: "material_operacional", label: "Material operacional" },
  { value: "produto_acabado_semielaborado", label: "Acabado/semielaborado" },
  { value: "produto_revenda", label: "Produto de revenda" },
  { value: "produto_acabado", label: "Produto acabado" },
  { value: "produto_acabado_porcionado", label: "Acabado/porcionado" },
];

export default function PreviewStep({ data, onBack, onConfirm, duplicados }) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [somenteErros, setSomenteErros] = useState(false);
  const [criarSaldoInicial, setCriarSaldoInicial] = useState(true);
  const [estrategiaDuplicado, setEstrategiaDuplicado] = useState("atualizar");

  const linhas = data.linhas;

  const stats = useMemo(() => {
    const por_tipo = {};
    let validos = 0, comErro = 0, dup = 0;
    linhas.forEach((l) => {
      if (l.valido) validos++; else comErro++;
      if (duplicados.has(l.id_externo) || duplicados.has(`nome:${l.nome.toLowerCase()}`)) dup++;
      const t = l.tipo_detalhado || "desconhecido";
      por_tipo[t] = (por_tipo[t] || 0) + 1;
    });
    return { total: linhas.length, validos, comErro, dup, por_tipo };
  }, [linhas, duplicados]);

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (somenteErros && l.valido) return false;
      if (filtroTipo !== "todos" && l.tipo_detalhado !== filtroTipo) return false;
      if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [linhas, busca, filtroTipo, somenteErros]);

  const isDup = (l) => duplicados.has(l.id_externo) || duplicados.has(`nome:${l.nome.toLowerCase()}`);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Lidos</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Válidos</div>
          <div className="text-2xl font-semibold text-emerald-600">{stats.validos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Com erros</div>
          <div className="text-2xl font-semibold text-destructive">{stats.comErro}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Já existem</div>
          <div className="text-2xl font-semibold text-amber-600">{stats.dup}</div>
        </Card>
      </div>

      {/* Opções */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id="saldo" checked={criarSaldoInicial} onCheckedChange={setCriarSaldoInicial} />
            <Label htmlFor="saldo" className="text-sm cursor-pointer">
              Criar saldo inicial em estoque para itens com quantidade &gt; 0
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Itens duplicados:</Label>
            <Select value={estrategiaDuplicado} onValueChange={setEstrategiaDuplicado}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="atualizar">Atualizar existente</SelectItem>
                <SelectItem value="ignorar">Ignorar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS_FILTRO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="erros" checked={somenteErros} onCheckedChange={setSomenteErros} />
          <Label htmlFor="erros" className="text-sm cursor-pointer">Só com problemas</Label>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Mostrando {filtradas.length} de {linhas.length}
        </div>
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="max-h-[460px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>UM</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((l) => (
                <TableRow key={l.linha} className={!l.valido ? "bg-destructive/5" : ""}>
                  <TableCell className="text-xs text-muted-foreground">{l.linha}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{l.nome || <em className="text-muted-foreground">(sem nome)</em>}</div>
                    {l.id_externo && <div className="text-[11px] text-muted-foreground">ID ext: {l.id_externo}</div>}
                    {l.erros.length > 0 && (
                      <div className="text-[11px] text-destructive mt-1">{l.erros.join(" • ")}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{l.tipo_label || "—"}</TableCell>
                  <TableCell className="text-xs">{l.categoria || "—"}</TableCell>
                  <TableCell className="text-right text-xs">{l.quantidade}</TableCell>
                  <TableCell className="text-xs">{l.unidade}</TableCell>
                  <TableCell className="text-right text-xs">
                    {l.custo_referencia !== null ? `R$ ${l.custo_referencia.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {l.valido ? (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 w-fit"><CheckCircle2 className="w-3 h-3 mr-1" />Ok</Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 w-fit"><AlertTriangle className="w-3 h-3 mr-1" />Erro</Badge>
                      )}
                      {isDup(l) && (
                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 w-fit"><Database className="w-3 h-3 mr-1" />Existe</Badge>
                      )}
                      {l.prioridade_revisao === "alta" && l.valido && (
                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 w-fit">Revisar</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        <Button
          onClick={() => onConfirm({ criarSaldoInicial, estrategiaDuplicado })}
          disabled={stats.validos === 0}
        >
          Confirmar importação ({stats.validos} {stats.validos === 1 ? "item" : "itens"})
        </Button>
      </div>
    </div>
  );
}