import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "@/components/financeiro/PageShell";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, RefreshCw, Bot } from "lucide-react";

const STATUS = ["recebido", "processando", "classificado", "precisa_revisao", "aguardando_confirmacao", "lancado", "duplicado", "cancelado", "erro"];
const TIPOS = ["cupom_fiscal", "nota_fiscal", "recibo", "boleto", "comprovante_pix", "comprovante_cartao", "comprovante_transferencia", "despesa_manual_texto", "despesa_por_audio", "compra_estoque", "compra_embalagem", "manutencao", "material_limpeza", "pagamento_funcionario", "motoboy_extra", "sangria_caixa", "reembolso", "orcamento", "outros"];
const statusVariant = (s) => s === "erro" || s === "cancelado" ? "destructive" : s === "aguardando_confirmacao" ? "default" : "secondary";
const fmtMoeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (v) => v ? new Date(v).toLocaleString("pt-BR") : "—";

export default function InboxFinanceiroWhatsapp() {
  const [rows, setRows] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [itens, setItens] = useState([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ loja: "all", status: "all", de: "", ate: "", fornecedor: "", categoria: "", tipo: "all", telefone: "" });

  const load = async () => {
    setLoading(true);
    const [inbox, lojasData] = await Promise.all([
      base44.entities.inbox_financeiro_whatsapp.list("-created_date", 500),
      base44.entities.Loja.list("nome", 500),
    ]);
    setRows(inbox || []);
    setLojas(lojasData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const lojaNome = (id) => lojas.find((l) => l.id === id)?.nome || "—";

  const filtrados = useMemo(() => rows.filter((r) => {
    if (f.loja !== "all" && r.loja_id !== f.loja) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.tipo !== "all" && r.tipo_entrada !== f.tipo) return false;
    if (f.telefone && !String(r.telefone_remetente || "").includes(f.telefone.replace(/\D/g, ""))) return false;
    if (f.fornecedor && !String(r.fornecedor_nome || "").toLowerCase().includes(f.fornecedor.toLowerCase())) return false;
    if (f.categoria && !String(r.categoria_financeira_sugerida || "").toLowerCase().includes(f.categoria.toLowerCase())) return false;
    const d = (r.criado_em || r.created_date || "").slice(0, 10);
    if (f.de && d < f.de) return false;
    if (f.ate && d > f.ate) return false;
    return true;
  }), [rows, f]);

  const abrir = async (r) => {
    setSel({ ...r });
    setItens(await base44.entities.inbox_financeiro_itens.filter({ inbox_financeiro_id: r.id }, "created_date", 300));
    setOpen(true);
  };

  const salvar = async (patch = {}) => {
    const data = { ...sel, ...patch };
    await base44.entities.inbox_financeiro_whatsapp.update(sel.id, data);
    setSel(data);
    await load();
  };

  const salvarItem = async (item, patch) => {
    const novo = { ...item, ...patch };
    await base44.entities.inbox_financeiro_itens.update(item.id, novo);
    setItens((arr) => arr.map((i) => i.id === item.id ? novo : i));
  };

  const reprocessar = async () => {
    await base44.functions.invoke("processarInboxFinanceiroWhatsapp", { inbox_financeiro_id: sel.id });
    setOpen(false);
    await load();
  };

  return (
    <PageShell
      title="Inbox Financeiro WhatsApp"
      description="Pré-lançamentos recebidos pelo WhatsApp para conferência humana."
      actions={<Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
        <Select value={f.loja} onValueChange={(v) => setF({ ...f, loja: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as lojas</SelectItem>{lojas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select>
        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos status</SelectItem>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} />
        <Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />
        <Input placeholder="Fornecedor" value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })} />
        <Input placeholder="Categoria" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} />
        <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos tipos</SelectItem>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Telefone" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Loja</TableHead><TableHead>Tipo</TableHead><TableHead>Fornecedor</TableHead><TableHead>Valor</TableHead><TableHead>Telefone</TableHead><TableHead>Recebido</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8}>Carregando...</TableCell></TableRow> : filtrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                <TableCell>{lojaNome(r.loja_id)}</TableCell>
                <TableCell>{r.tipo_entrada || "—"}</TableCell>
                <TableCell>{r.fornecedor_nome || "—"}<div className="text-xs text-muted-foreground">{r.categoria_financeira_sugerida}</div></TableCell>
                <TableCell>{r.valor_total ? fmtMoeda(r.valor_total) : "—"}</TableCell>
                <TableCell className="font-mono">{r.telefone_remetente}</TableCell>
                <TableCell>{fmtData(r.criado_em || r.created_date)}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => abrir(r)}><Eye className="w-4 h-4" /> Conferir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-auto">
          <DialogHeader><DialogTitle>Conferência do pré-lançamento</DialogTitle></DialogHeader>
          {sel && <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="space-y-1"><span className="text-sm font-medium">Loja</span><LojaSingleSelect value={sel.loja_id} onChange={(v) => setSel({ ...sel, loja_id: v })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Tipo de entrada</span><Select value={sel.tipo_entrada || "outros"} onValueChange={(v) => setSel({ ...sel, tipo_entrada: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1"><span className="text-sm font-medium">Tipo documento</span><Input value={sel.tipo_documento || ""} onChange={(e) => setSel({ ...sel, tipo_documento: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Status</span><Select value={sel.status || "recebido"} onValueChange={(v) => setSel({ ...sel, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1"><span className="text-sm font-medium">Fornecedor</span><Input value={sel.fornecedor_nome || ""} onChange={(e) => setSel({ ...sel, fornecedor_nome: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Data documento</span><Input type="date" value={sel.data_documento || ""} onChange={(e) => setSel({ ...sel, data_documento: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Vencimento</span><Input type="date" value={sel.data_vencimento || ""} onChange={(e) => setSel({ ...sel, data_vencimento: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Valor total</span><Input type="number" value={sel.valor_total ?? ""} onChange={(e) => setSel({ ...sel, valor_total: Number(e.target.value || 0) })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Categoria financeira</span><Input value={sel.categoria_financeira_sugerida || ""} onChange={(e) => setSel({ ...sel, categoria_financeira_sugerida: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Centro de custo</span><Input value={sel.centro_custo_sugerido || ""} onChange={(e) => setSel({ ...sel, centro_custo_sugerido: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Forma de pagamento</span><Input value={sel.forma_pagamento || ""} onChange={(e) => setSel({ ...sel, forma_pagamento: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-sm font-medium">Conta origem</span><Input value={sel.conta_origem || ""} onChange={(e) => setSel({ ...sel, conta_origem: e.target.value })} /></label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {["eh_compra_estoque", "eh_conta_pagar", "eh_despesa_paga", "eh_comprovante_pagamento", "eh_orcamento"].map((k) => <label key={k} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{k.replace("eh_", "").replaceAll("_", " ")}</span><Switch checked={!!sel[k]} onCheckedChange={(v) => setSel({ ...sel, [k]: v })} /></label>)}
            </div>

            <label className="space-y-1 block"><span className="text-sm font-medium">Observações</span><Textarea value={sel.observacao_ia || ""} onChange={(e) => setSel({ ...sel, observacao_ia: e.target.value })} /></label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><div className="text-sm font-medium mb-1">Mensagem original</div><pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap min-h-32">{sel.mensagem_original || "—"}</pre></div>
              <div><div className="text-sm font-medium mb-1">Arquivo original</div>{sel.arquivo_url ? <a className="text-primary underline break-all" href={sel.arquivo_url} target="_blank" rel="noreferrer">Abrir arquivo</a> : <div className="text-muted-foreground text-sm">Sem arquivo</div>}</div>
              <div><div className="text-sm font-medium mb-1">JSON extraído</div><pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap max-h-64 overflow-auto">{sel.json_extraido || "—"}</pre></div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Itens extraídos</div>
              <div className="rounded-lg border overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Qtd</TableHead><TableHead>Un.</TableHead><TableHead>Unit.</TableHead><TableHead>Total</TableHead><TableHead>Categoria</TableHead><TableHead>Produto</TableHead><TableHead>Estoque</TableHead></TableRow></TableHeader><TableBody>{itens.length === 0 ? <TableRow><TableCell colSpan={8}>Nenhum item extraído.</TableCell></TableRow> : itens.map((i) => <TableRow key={i.id}><TableCell><Input value={i.descricao_original || ""} onChange={(e) => salvarItem(i, { descricao_original: e.target.value })} /></TableCell><TableCell><Input type="number" value={i.quantidade ?? ""} onChange={(e) => salvarItem(i, { quantidade: Number(e.target.value || 0) })} /></TableCell><TableCell><Input value={i.unidade || ""} onChange={(e) => salvarItem(i, { unidade: e.target.value })} /></TableCell><TableCell><Input type="number" value={i.valor_unitario ?? ""} onChange={(e) => salvarItem(i, { valor_unitario: Number(e.target.value || 0) })} /></TableCell><TableCell><Input type="number" value={i.valor_total ?? ""} onChange={(e) => salvarItem(i, { valor_total: Number(e.target.value || 0) })} /></TableCell><TableCell><Input value={i.categoria_sugerida || ""} onChange={(e) => salvarItem(i, { categoria_sugerida: e.target.value })} /></TableCell><TableCell><Input value={i.produto_sugerido || ""} onChange={(e) => salvarItem(i, { produto_sugerido: e.target.value })} /></TableCell><TableCell><Switch checked={!!i.entra_estoque} onCheckedChange={(v) => salvarItem(i, { entra_estoque: v })} /></TableCell></TableRow>)}</TableBody></Table></div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={reprocessar}><Bot className="w-4 h-4" /> Reprocessar com IA</Button>
              <Button variant="outline" onClick={() => salvar({ status: "precisa_revisao" })}>Enviar para revisão</Button>
              <Button variant="outline" onClick={() => salvar({ status: "duplicado" })}>Marcar como duplicado</Button>
              <Button variant="destructive" onClick={() => salvar({ status: "cancelado" })}>Cancelar</Button>
              <Button onClick={() => salvar({ status: "aguardando_confirmacao", confirmado_em: new Date().toISOString() })}>Confirmar e lançar</Button>
              <Button variant="secondary" onClick={() => salvar()}>Salvar edição</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}