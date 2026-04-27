import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import ItemPicker from "@/components/operacoes/ItemPicker";
import OperacaoStatusBadge from "@/components/operacoes/OperacaoStatusBadge";
import { calcularSaldos, getSaldo, registrarMovimentacoes } from "@/lib/operacoes-service";

const empty = () => ({
  numero: "",
  loja_id: "",
  data: new Date().toISOString().slice(0, 10),
  responsavel: "",
  itens: [],
  status: "em_contagem",
  observacoes: "",
});

export default function InventarioDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);
  // Visão de gestor: mostra saldo esperado. Funcionário começa com isso desligado por padrão.
  const [verSaldoEsperado, setVerSaldoEsperado] = useState(false);
  const [saldosMap, setSaldosMap] = useState(new Map());
  const isView = mode === "view";
  const isCreate = !record;

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      setVerSaldoEsperado(false);
      base44.entities.MovimentacaoEstoque.list("-created_date", 5000).then((m) => {
        setSaldosMap(calcularSaldos(m || []));
      });
    }
  }, [open, record]);

  const addItem = () => setData({ ...data, itens: [...(data.itens || []), { item_tipo: "insumo", item_id: "", item_nome: "", quantidade_contada: 0 }] });
  const updateItem = (idx, patch) => setData({ ...data, itens: data.itens.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  const removeItem = (idx) => setData({ ...data, itens: data.itens.filter((_, i) => i !== idx) });

  const salvarContagem = async () => {
    if (!data.loja_id) return;
    setSaving(true);
    if (record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Inventario.update(id, rest);
    } else {
      await base44.entities.Inventario.create(data);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const fechar = async () => {
    if (!record?.id) return;
    setSaving(true);

    // Calcula saldos esperados e gera movimentações de ajuste
    const itensComSaldo = (data.itens || []).map((it) => {
      const esperado = getSaldo(saldosMap, it.item_id, data.loja_id);
      const contado = Number(it.quantidade_contada) || 0;
      return { ...it, saldo_esperado: esperado, diferenca: contado - esperado };
    });

    const movs = itensComSaldo
      .filter((it) => it.item_id && Math.abs(it.diferenca) > 0.0001)
      .map((it) => ({
        tipo: "inventario",
        item_tipo: it.item_tipo,
        item_id: it.item_id,
        item_nome: it.item_nome,
        quantidade: it.diferenca,
        loja_id: data.loja_id,
        data: data.data,
        motivo: "Ajuste por inventário",
        origem_tipo: "inventario",
        origem_id: record.id,
      }));

    await registrarMovimentacoes(movs);
    await base44.entities.Inventario.update(record.id, {
      ...data,
      itens: itensComSaldo,
      status: "fechado",
    });

    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isCreate ? "Novo inventário" : `Inventário ${data.numero || ""}`}
            {!isCreate && <OperacaoStatusBadge status={data.status} />}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Número">
            <Input value={data.numero || ""} onChange={(e) => setData({ ...data, numero: e.target.value })} disabled={isView || data.status === "fechado"} />
          </Field>
          <Field label="Data" required>
            <Input type="date" value={data.data || ""} onChange={(e) => setData({ ...data, data: e.target.value })} disabled={isView || data.status === "fechado"} />
          </Field>
          <Field label="Loja" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => setData({ ...data, loja_id: v })} allowEmpty={false} />
          </Field>
          <Field label="Responsável" className="md:col-span-3">
            <Input value={data.responsavel || ""} onChange={(e) => setData({ ...data, responsavel: e.target.value })} disabled={isView || data.status === "fechado"} />
          </Field>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Itens contados</div>
            <div className="flex items-center gap-2">
              {data.status !== "fechado" && (
                <button
                  type="button"
                  onClick={() => setVerSaldoEsperado((v) => !v)}
                  className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  title="Visão de gestor"
                >
                  <ShieldAlert className="w-3 h-3" />
                  {verSaldoEsperado ? "Ocultar saldo esperado" : "Ver saldo esperado (gestor)"}
                </button>
              )}
              {!isView && data.status !== "fechado" && (
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1.5" />Adicionar
                </Button>
              )}
            </div>
          </div>

          {!data.loja_id && (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Selecione a loja para começar.
            </Card>
          )}

          {data.loja_id && (
            <div className="space-y-2">
              {(data.itens || []).length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum item adicionado</Card>
              )}
              {(data.itens || []).map((it, idx) => {
                const esperado = it.item_id ? getSaldo(saldosMap, it.item_id, data.loja_id) : 0;
                const contado = Number(it.quantidade_contada) || 0;
                const diferenca = contado - esperado;
                return (
                  <Card key={idx} className="p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-6">
                        <div className="text-[11px] text-muted-foreground mb-1">Item</div>
                        <ItemPicker
                          tipo="ambos"
                          value={{ item_tipo: it.item_tipo, item_id: it.item_id, item_nome: it.item_nome }}
                          onChange={(v) => updateItem(idx, v)}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <div className="text-[11px] text-muted-foreground mb-1">Quantidade contada</div>
                        <Input
                          type="number"
                          step="0.001"
                          value={it.quantidade_contada ?? ""}
                          onChange={(e) => updateItem(idx, { quantidade_contada: parseFloat(e.target.value) || 0 })}
                          disabled={isView || data.status === "fechado"}
                        />
                      </div>
                      {(verSaldoEsperado || data.status === "fechado") && (
                        <div className="col-span-4 md:col-span-2 text-right">
                          <div className="text-[11px] text-muted-foreground mb-1">Esperado / Diferença</div>
                          <div className="text-xs font-mono">
                            {(data.status === "fechado" ? it.saldo_esperado : esperado).toFixed(3)}
                          </div>
                          <div className={`text-xs font-mono ${(data.status === "fechado" ? it.diferenca : diferenca) === 0 ? "text-muted-foreground" : (data.status === "fechado" ? it.diferenca : diferenca) > 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {(data.status === "fechado" ? it.diferenca : diferenca) >= 0 ? "+" : ""}{(data.status === "fechado" ? it.diferenca : diferenca).toFixed(3)}
                          </div>
                        </div>
                      )}
                      <div className="col-span-2 md:col-span-1 flex justify-end">
                        {!isView && data.status !== "fechado" && (
                          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!isView && data.status !== "fechado" && (
            <>
              <Button variant="outline" onClick={salvarContagem} disabled={saving || !data.loja_id}>
                {saving ? "..." : "Salvar contagem"}
              </Button>
              {!isCreate && (
                <Button onClick={fechar} disabled={saving || !data.loja_id || (data.itens || []).length === 0}>
                  {saving ? "..." : "Fechar inventário"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}