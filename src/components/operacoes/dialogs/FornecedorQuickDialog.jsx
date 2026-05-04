import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/cadastros/Field";
import { toast } from "sonner";

const empty = () => ({ nome: "", cnpj_cpf: "", telefone: "", email: "", contato: "" });

export default function FornecedorQuickDialog({ open, onClose, onCreated }) {
  const [data, setData] = useState(empty());
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!data.nome.trim()) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Fornecedor.create({ ...data, ativo: true });
      toast.success("Fornecedor cadastrado.");
      onCreated?.(created);
      setData(empty());
      onClose?.();
    } catch {
      toast.error("Erro ao cadastrar fornecedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setData(empty()); onClose?.(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro rápido de fornecedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Nome" required>
            <Input autoFocus value={data.nome} onChange={(e) => setData({ ...data, nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ / CPF">
              <Input value={data.cnpj_cpf} onChange={(e) => setData({ ...data, cnpj_cpf: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={data.telefone} onChange={(e) => setData({ ...data, telefone: e.target.value })} />
            </Field>
          </div>
          <Field label="E-mail">
            <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </Field>
          <Field label="Contato">
            <Input value={data.contato} onChange={(e) => setData({ ...data, contato: e.target.value })} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !data.nome.trim()}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}