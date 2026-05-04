import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Eye, Pencil, Power, ChevronLeft, Sparkles, Lock } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/cadastros/StatusBadge";
import CadastroDialog from "@/components/cadastros/CadastroDialog";
import { CATALOGO, GRUPOS } from "@/lib/plano-categorias";
import { toast } from "sonner";

const CONFIG_CADASTRO = {
  entity: "CategoriaFinanceira",
  title: "Categorias Financeiras",
  singular: "Categoria Financeira",
  hasLoja: false,
  formComponent: "CategoriaFinanceiraForm",
};

export default function PlanoCategorias() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("ativos");
  const [dreFilter, setDreFilter] = useState("todos");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CategoriaFinanceira.list("-created_date", 1000);
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const aplicarPlanoPadrao = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const existentes = await base44.entities.CategoriaFinanceira.list("-created_date", 1000);
      const porCodigo = new Map(existentes.filter((c) => c.codigo).map((c) => [c.codigo, c]));
      const aCriar = [];
      let atualizadas = 0;

      for (const cat of CATALOGO) {
        const existente = porCodigo.get(cat.codigo);
        if (!existente) {
          aCriar.push(cat);
        } else if (existente.sistema && (
          existente.grupo_dre !== cat.grupo_dre ||
          existente.impacta_dre !== cat.impacta_dre ||
          existente.natureza_uso !== cat.natureza_uso
        )) {
          // Reforça regras DRE em categorias do sistema
          await base44.entities.CategoriaFinanceira.update(existente.id, {
            grupo: cat.grupo, grupo_dre: cat.grupo_dre, tipo_dre: cat.tipo_dre,
            impacta_dre: cat.impacta_dre, natureza_uso: cat.natureza_uso,
            ordem_dre: cat.ordem_dre, regra_uso: cat.regra_uso, sistema: true,
          });
          atualizadas++;
        }
      }
      if (aCriar.length > 0) {
        await base44.entities.CategoriaFinanceira.bulkCreate(aCriar);
      }
      toast.success(`Plano aplicado: ${aCriar.length} criadas, ${atualizadas} atualizadas.`);
      load();
    } catch (e) {
      toast.error("Falha: " + (e?.message || "erro"));
    } finally { setSeeding(false); }
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === "ativos" && it.ativo === false) return false;
      if (statusFilter === "inativos" && it.ativo !== false) return false;
      if (grupo !== "todos" && it.grupo !== grupo) return false;
      if (dreFilter === "impacta" && !it.impacta_dre) return false;
      if (dreFilter === "nao_impacta" && it.impacta_dre) return false;
      if (search) {
        const s = search.toLowerCase();
        const hit = ["nome", "codigo", "grupo", "grupo_dre", "subgrupo"].some((f) =>
          String(it[f] || "").toLowerCase().includes(s)
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [items, search, grupo, statusFilter, dreFilter]);

  const agrupado = useMemo(() => {
    const map = new Map();
    for (const it of filtered) {
      const k = it.grupo || "Outros";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleAtivo = async (item) => {
    await base44.entities.CategoriaFinanceira.update(item.id, { ativo: item.ativo === false });
    load();
  };

  return (
    <div>
      <Link to="/admin/cadastros" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="w-3 h-3" /> Voltar para Cadastros
      </Link>

      <PageHeader
        title="Plano de Categorias Financeiras"
        description="Estrutura gerencial: receita, dedução, CMV, despesa, investimento, sócio, transferências e baixas de recebíveis."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={aplicarPlanoPadrao} disabled={seeding}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              {seeding ? "Aplicando..." : "Aplicar plano padrão"}
            </Button>
            <Button onClick={() => setDialog({ open: true, mode: "create", record: null })}>
              <Plus className="w-4 h-4 mr-1.5" /> Nova
            </Button>
          </div>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, código, grupo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger className="w-full md:w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dreFilter} onValueChange={setDreFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">DRE: todos</SelectItem>
              <SelectItem value="impacta">Impacta DRE</SelectItem>
              <SelectItem value="nao_impacta">Não impacta DRE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Apenas ativos</SelectItem>
              <SelectItem value="inativos">Apenas inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Carregando...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma categoria. Clique em "Aplicar plano padrão" para criar a estrutura inicial.
        </Card>
      ) : (
        <div className="space-y-4">
          {agrupado.map(([nomeGrupo, itens]) => (
            <Card key={nomeGrupo} className="overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/40 flex justify-between items-center">
                <div className="text-sm font-semibold">{nomeGrupo}</div>
                <div className="text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? "categoria" : "categorias"}</div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>DRE</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it) => (
                      <TableRow key={it.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">
                          {it.sistema && <Lock className="w-3 h-3 inline mr-1 text-muted-foreground" />}
                          {it.codigo || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {it.nome}
                          {it.regra_uso && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{it.regra_uso}</div>}
                        </TableCell>
                        <TableCell><span className="text-xs uppercase text-muted-foreground">{it.tipo}</span></TableCell>
                        <TableCell>
                          {it.impacta_dre ? (
                            <span className="text-[11px] px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {it.grupo_dre || "—"}
                            </span>
                          ) : (
                            <span className="text-[11px] px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                              fora da DRE
                            </span>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge ativo={it.ativo} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDialog({ open: true, mode: "view", record: it })}>
                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDialog({ open: true, mode: "edit", record: it })}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleAtivo(it)}>
                                <Power className="w-4 h-4 mr-2" />
                                {it.ativo === false ? "Ativar" : "Inativar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-3">
        {filtered.length} {filtered.length === 1 ? "categoria" : "categorias"}
      </div>

      <CadastroDialog
        open={dialog.open}
        mode={dialog.mode}
        config={CONFIG_CADASTRO}
        record={dialog.record}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={load}
      />
    </div>
  );
}