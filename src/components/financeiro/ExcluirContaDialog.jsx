import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registrarLog } from "@/lib/auditoria-service";

/**
 * Diálogo para excluir uma conta a pagar/receber com motivo obrigatório.
 * Regra: só permite exclusão se NÃO houver pagamento/recebimento registrado.
 * Caso contrário, instrui o usuário a estornar antes.
 */
export default function ExcluirContaDialog({ open, onClose, documento, documento_tipo = "conta_pagar", onDeleted }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  if (!documento) return null;

  const isPagar = documento_tipo === "conta_pagar";
  const valorMovimentado = Number(isPagar ? documento.valor_pago : documento.valor_recebido) || 0;
  const podeExcluir = valorMovimentado === 0 && documento.status !== "paga" && documento.status !== "recebida";

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
      const Entity = isPagar ? base44.entities.ContaPagar : base44.entities.ContaReceber;
      await registrarLog({
        modulo: "financeiro",
        acao: "excluir",
        entidade: isPagar ? "ContaPagar" : "ContaReceber",
        entidade_id: documento.id,
        descricao: `Exclusão de ${isPagar ? "conta a pagar" : "conta a receber"}: ${documento.descricao || "(sem descrição)"} — R$ ${Number(documento.valor || 0).toFixed(2)}`,
        origem: "humano",
        valor_anterior: documento,
        valor_novo: null,
        critico: true,
        justificativa: m,
        loja_id: documento.loja_id,
      });
      await Entity.delete(documento.id);
      toast.success("Lançamento excluído.");
      setMotivo("");
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
            Excluir lançamento
          </DialogTitle>
          <DialogDescription>
            Esta ação é permanente e ficará registrada no log de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div><span className="text-muted-foreground">Descrição:</span> <strong>{documento.descricao || "—"}</strong></div>
            <div><span className="text-muted-foreground">Valor:</span> <span className="font-mono">R$ {Number(documento.valor || 0).toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Status:</span> {documento.status}</div>
          </div>

          {!podeExcluir ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive text-xs">
              Este lançamento já possui {isPagar ? "pagamento" : "recebimento"} de R$ {valorMovimentado.toFixed(2)}.
              Estorne a baixa antes de excluir, ou cancele o lançamento pela edição.
            </div>
          ) : (
            <div>
              <Label htmlFor="motivo">Motivo da exclusão <span className="text-destructive">*</span></Label>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Ex: lançado por engano em ambiente de teste"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                O motivo é obrigatório e ficará no log de auditoria com seu usuário e horário.
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