import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registrarLog } from "@/lib/auditoria-service";

/**
 * Exclusão de ContaBancaria.
 * Regra: só permite excluir se NÃO houver movimentações além do "saldo_inicial".
 * Caso haja, sugere inativar a conta (botão Power já disponível na lista).
 */
export default function ExcluirContaBancariaDialog({ open, conta, onClose, onDeleted }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState({ loading: true, total: 0, soSaldoInicial: 0 });

  useEffect(() => {
    if (!open || !conta?.id) return;
    setMotivo("");
    setCheck({ loading: true, total: 0, soSaldoInicial: 0 });
    base44.entities.MovimentacaoBancaria
      .filter({ conta_bancaria_id: conta.id }, "-data", 500)
      .then((movs) => {
        const soSaldoInicial = movs.filter((m) => m.tipo === "saldo_inicial" || m.origem_tipo === "saldo_inicial").length;
        setCheck({ loading: false, total: movs.length, soSaldoInicial });
      })
      .catch(() => setCheck({ loading: false, total: 0, soSaldoInicial: 0 }));
  }, [open, conta?.id]);

  if (!conta) return null;

  const movsReais = check.total - check.soSaldoInicial;
  const podeExcluir = !check.loading && movsReais === 0;

  const handleClose = () => {
    if (saving) return;
    setMotivo("");
    onClose?.();
  };

  const confirmar = async () => {
    const m = motivo.trim();
    if (m.length < 5) {
      toast.error("Informe um motivo (mín. 5 caracteres).");
      return;
    }
    setSaving(true);
    try {
      await registrarLog({
        modulo: "financeiro",
        acao: "excluir",
        entidade: "ContaBancaria",
        entidade_id: conta.id,
        descricao: `Exclusão de conta bancária: ${conta.nome}`,
        origem: "humano",
        valor_anterior: conta,
        valor_novo: null,
        critico: true,
        justificativa: m,
        loja_id: conta.loja_id,
      });
      // Remove o saldo inicial vinculado (se houver) e a conta
      const movs = await base44.entities.MovimentacaoBancaria.filter({ conta_bancaria_id: conta.id }, "-data", 100);
      for (const mv of movs) {
        if (mv.tipo === "saldo_inicial" || mv.origem_tipo === "saldo_inicial") {
          await base44.entities.MovimentacaoBancaria.delete(mv.id);
        }
      }
      await base44.entities.ContaBancaria.delete(conta.id);
      toast.success("Conta bancária excluída.");
      onDeleted?.();
      onClose?.();
    } catch (e) {
      toast.error("Falha ao excluir: " + (e?.message || "erro"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Excluir conta bancária
          </DialogTitle>
          <DialogDescription>
            Esta ação é permanente e ficará registrada no log de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div><span className="text-muted-foreground">Conta:</span> <strong>{conta.nome}</strong></div>
            <div><span className="text-muted-foreground">Banco:</span> {conta.instituicao || conta.banco || "—"}</div>
            <div><span className="text-muted-foreground">Tipo:</span> {(conta.tipo_conta || conta.tipo || "").replace(/_/g, " ")}</div>
          </div>

          {check.loading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Verificando movimentações...
            </div>
          ) : !podeExcluir ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive text-xs">
              Esta conta possui <strong>{movsReais}</strong> movimentação(ões) registrada(s).
              Por segurança contábil, não é possível excluir contas com histórico.
              <div className="mt-1 opacity-90">Sugestão: inative a conta (ícone de energia na lista) em vez de excluir.</div>
            </div>
          ) : (
            <div>
              <Label htmlFor="motivo">Motivo da exclusão <span className="text-destructive">*</span></Label>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Ex: cadastrei errado, conta duplicada"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {check.soSaldoInicial > 0 && "O lançamento de saldo inicial será removido junto. "}
                O motivo é obrigatório e ficará no log de auditoria.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={!podeExcluir || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Excluir definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}