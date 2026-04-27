import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import FechamentoStatusBadge from "./FechamentoStatusBadge";
import SecaoCanais from "./SecaoCanais";
import SecaoPagamentos from "./SecaoPagamentos";
import SecaoSangrias from "./SecaoSangrias";
import SecaoDespesas from "./SecaoDespesas";
import { calcularTotais, regerarRecebiveis } from "@/lib/vendas-service";

const empty = () => ({
  loja_id: "",
  data: new Date().toISOString().slice(0, 10),
  responsavel: "",
  vendas_por_canal: [],
  vendas_por_pagamento: [],
  sangrias: [],
  despesas_caixa: [],
  status: "aberto",
  observacoes: "",
});

export default function FechamentoDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [canais, setCanais] = useState([]);
  const [formas, setFormas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";
  const isLocked = data.status === "fechado";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      Promise.all([
        base44.entities.CanalVenda.filter({ ativo: true }),
        base44.entities.FormaPagamento.filter({ ativo: true }),
        base44.entities.CategoriaFinanceira.list(),
      ]).then(([c, f, cat]) => { setCanais(c); setFormas(f); setCategorias(cat); });
    }
  }, [open, record]);

  // Filtra canais/formas pela loja
  const canaisLoja = useMemo(() => canais.filter((c) =>
    !c.loja_ids?.length || c.loja_ids.includes(data.loja_id)
  ), [canais, data.loja_id]);

  const formasLoja = useMemo(() => formas.filter((f) =>
    !f.loja_ids?.length || f.loja_ids.includes(data.loja_id)
  ), [formas, data.loja_id]);

  const totais = useMemo(() => calcularTotais(data), [data]);
  const tipoMode = mode === "conferir" ? "conferir" : "lancar";
  const mostrarConferido = tipoMode === "conferir" || isView;
  const disabled = isView || isLocked;

  const persist = async (status) => {
    setSaving(true);
    const totaisFinais = calcularTotais(data);
    const payload = {
      ...data,
      ...totaisFinais,
      status,
    };
    let saved;
    if (record?.id) {
      const { id, ...rest } = payload;
      saved = await base44.entities.FechamentoDiario.update(id, rest);
    } else {
      saved = await base44.entities.FechamentoDiario.create(payload);
    }
    // Gera recebíveis ao conferir/fechar
    if (status === "conferido" || status === "fechado") {
      await regerarRecebiveis({ ...saved, ...payload, id: saved.id || record.id }, formas);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const lancarOuSalvar = () => persist("aberto");
  const conferir = () => {
    const status = Math.abs(totais.divergencia) > 0.001 ? "divergente" : "conferido";
    persist(status);
  };
  const fechar = () => persist("fechado");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isView ? "Fechamento" : record ? "Editar fechamento" : "Novo fechamento diário"}
            {record && <FechamentoStatusBadge status={data.status} />}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Loja" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} allowEmpty={false} />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Responsável">
            <Input value={data.responsavel || ""} onChange={(e) => setData({ ...data, responsavel: e.target.value })} disabled={disabled} />
          </Field>
        </div>

        {!data.loja_id ? (
          <Card className="p-6 text-sm text-muted-foreground text-center">Selecione a loja para começar.</Card>
        ) : (
          <Tabs defaultValue="canais" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="canais">Canais</TabsTrigger>
              <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
              <TabsTrigger value="sangrias">Sangrias</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>
            <TabsContent value="canais" className="pt-3">
              <SecaoCanais
                canais={canaisLoja}
                vendas={data.vendas_por_canal || []}
                onChange={(v) => setData({ ...data, vendas_por_canal: v })}
                disabled={disabled}
              />
            </TabsContent>
            <TabsContent value="pagamentos" className="pt-3">
              <SecaoPagamentos
                formas={formasLoja}
                pagamentos={data.vendas_por_pagamento || []}
                onChange={(v) => setData({ ...data, vendas_por_pagamento: v })}
                disabled={disabled}
                mostrarConferido={mostrarConferido}
              />
            </TabsContent>
            <TabsContent value="sangrias" className="pt-3">
              <SecaoSangrias
                sangrias={data.sangrias || []}
                onChange={(v) => setData({ ...data, sangrias: v })}
                disabled={disabled}
              />
            </TabsContent>
            <TabsContent value="despesas" className="pt-3">
              <SecaoDespesas
                despesas={data.despesas_caixa || []}
                categorias={categorias}
                onChange={(v) => setData({ ...data, despesas_caixa: v })}
                disabled={disabled}
              />
            </TabsContent>
          </Tabs>
        )}

        <Card className="p-4 mt-2 bg-muted/40">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <Resumo label="Vendas" valor={totais.total_vendas} />
            <Resumo label="Pag. declarado" valor={totais.total_pagamentos_declarado} />
            <Resumo label="Pag. conferido" valor={totais.total_pagamentos_conferido} />
            <Resumo label="Sangrias" valor={totais.total_sangrias} />
            <Resumo label="Despesas" valor={totais.total_despesas} />
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium">Divergência (vendas − conferido)</span>
            <div className="flex items-center gap-2">
              {Math.abs(totais.divergencia) > 0.001 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span className={`font-mono text-sm font-semibold ${Math.abs(totais.divergencia) > 0.001 ? "text-amber-700" : "text-emerald-700"}`}>
                R$ {totais.divergencia.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        <Field label="Observações" className="mt-2">
          <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => setData({ ...data, observacoes: e.target.value })} disabled={disabled} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!isView && !isLocked && (
            <>
              <Button variant="outline" onClick={lancarOuSalvar} disabled={saving || !data.loja_id}>
                {saving ? "..." : record ? "Salvar" : "Lançar (aberto)"}
              </Button>
              {record && (
                <>
                  <Button variant="outline" onClick={conferir} disabled={saving}>
                    {saving ? "..." : "Conferir"}
                  </Button>
                  <Button onClick={fechar} disabled={saving}>
                    {saving ? "..." : "Fechar caixa"}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ label, valor }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-medium">R$ {Number(valor || 0).toFixed(2)}</div>
    </div>
  );
}