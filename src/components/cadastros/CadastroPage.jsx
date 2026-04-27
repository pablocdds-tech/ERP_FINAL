import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Eye, Pencil, Power, ChevronLeft } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "./StatusBadge";
import CadastroDialog from "./CadastroDialog";

const formatValue = (val, format) => {
  if (val === null || val === undefined || val === "") return "—";
  if (format === "money") return `R$ ${Number(val).toFixed(2).replace(".", ",")}`;
  if (format === "percent") return `${Number(val).toFixed(2)}%`;
  return String(val);
};

export default function CadastroPage({ config }) {
  const Entity = base44.entities[config.entity];
  const [items, setItems] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativos");
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });

  const load = async () => {
    setLoading(true);
    const data = await Entity.list("-created_date", 500);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [config.entity]);
  useEffect(() => {
    if (config.hasLoja) base44.entities.Loja.list().then((d) => setLojas(d || []));
  }, [config.hasLoja]);

  // Sincroniza com o LojaSwitcher do topbar
  useEffect(() => {
    const stored = localStorage.getItem("erp.loja.selecionada");
    if (stored) setLojaFilter(stored);
    const handler = (e) => setLojaFilter(e.detail || "todas");
    window.addEventListener("loja-changed", handler);
    return () => window.removeEventListener("loja-changed", handler);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === "ativos" && it.ativo === false) return false;
      if (statusFilter === "inativos" && it.ativo !== false) return false;

      if (search) {
        const s = search.toLowerCase();
        const hit = (config.searchFields || []).some((f) =>
          String(it[f] || "").toLowerCase().includes(s)
        );
        if (!hit) return false;
      }

      if (config.hasLoja && lojaFilter && lojaFilter !== "todas") {
        const v = it[config.lojaField];
        if (config.hasLoja === "multi") {
          if (v && v.length > 0 && !v.includes(lojaFilter)) return false;
        } else if (config.hasLoja === "single") {
          if (v && v !== lojaFilter) return false;
        }
      }
      return true;
    });
  }, [items, search, statusFilter, lojaFilter, config]);

  const toggleAtivo = async (item) => {
    await Entity.update(item.id, { ativo: item.ativo === false });
    load();
  };

  const openDialog = (mode, record = null) =>
    setDialog({ open: true, mode, record });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const renderLojas = (val) => {
    if (!val || (Array.isArray(val) && val.length === 0)) {
      return <span className="text-xs text-muted-foreground">Todas</span>;
    }
    if (Array.isArray(val)) {
      return (
        <span className="text-xs">
          {val.map((id) => lojas.find((l) => l.id === id)?.nome || "—").join(", ")}
        </span>
      );
    }
    return <span className="text-xs">{lojas.find((l) => l.id === val)?.nome || "—"}</span>;
  };

  return (
    <div>
      <Link to="/cadastros" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="w-3 h-3" />
        Voltar para Cadastros
      </Link>

      <PageHeader
        title={config.title}
        description={`Gerencie ${config.title.toLowerCase()} do sistema.`}
        actions={
          !config.readOnly && (
            <Button onClick={() => openDialog("create")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo
            </Button>
          )
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {config.hasLoja && (
            <Select value={lojaFilter} onValueChange={setLojaFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as lojas</SelectItem>
                {lojas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Apenas ativos</SelectItem>
              <SelectItem value="inativos">Apenas inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {config.columns.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
                {config.hasLoja && <TableHead>Lojas</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 3} className="text-center py-10 text-sm text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 3} className="text-center py-10 text-sm text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((it) => (
                  <TableRow key={it.id} className="hover:bg-muted/30">
                    {config.columns.map((c) => (
                      <TableCell key={c.key} className={c.key === config.columns[0].key ? "font-medium" : ""}>
                        {formatValue(it[c.key], c.format)}
                      </TableCell>
                    ))}
                    {config.hasLoja && <TableCell>{renderLojas(it[config.lojaField])}</TableCell>}
                    <TableCell><StatusBadge ativo={it.ativo} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog("view", it)}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          {!config.readOnly && (
                            <>
                              <DropdownMenuItem onClick={() => openDialog("edit", it)}>
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleAtivo(it)}>
                                <Power className="w-4 h-4 mr-2" />
                                {it.ativo === false ? "Ativar" : "Inativar"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {config.readOnly && (
                            <DropdownMenuItem onClick={() => openDialog("edit", it)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground mt-3">
        {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
      </div>

      <CadastroDialog
        open={dialog.open}
        mode={dialog.mode}
        config={config}
        record={dialog.record}
        onClose={closeDialog}
        onSaved={load}
      />
    </div>
  );
}