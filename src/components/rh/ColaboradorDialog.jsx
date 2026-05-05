import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/cadastros/Field";
import LojaSingleSelect from "@/components/cadastros/LojaSingleSelect";
import SecaoFacialColaborador from "@/components/ponto/SecaoFacialColaborador";

const empty = () => ({
  nome: "", cpf: "", email: "", telefone: "",
  cargo_id: "", loja_id: "", data_admissao: "",
  perfil_pwa: "funcionario", usa_pwa: false,
  status: "ativo", salario: 0, endereco: "", observacoes: "",
  pin_ponto: "",
});

export default function ColaboradorDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [cargos, setCargos] = useState([]);
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => {
    if (open) {
      setData(record ? { ...record } : empty());
      base44.entities.Cargo.filter({ ativo: true }).then(setCargos);
    }
  }, [open, record]);

  const set = (k, v) => setData({ ...data, [k]: v });

  const salvar = async () => {
    if (!data.nome) return;
    setSaving(true);
    if (record?.id) {
      const { id, ...rest } = data;
      await base44.entities.Colaborador.update(id, rest);
    } else await base44.entities.Colaborador.create(data);
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const recarregar = async () => {
    if (!data.id) return;
    const fresh = await base44.entities.Colaborador.filter({ id: data.id });
    if (fresh[0]) setData({ ...fresh[0] });
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isView ? "Colaborador" : record ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome" required className="col-span-2">
            <Input value={data.nome} onChange={(e) => set("nome", e.target.value)} disabled={isView} />
          </Field>
          <Field label="CPF"><Input value={data.cpf || ""} onChange={(e) => set("cpf", e.target.value)} disabled={isView} /></Field>
          <Field label="Telefone"><Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} disabled={isView} /></Field>

          <Field label="Usa PWA pessoal?" required hint="Se 'Não', bate ponto só pelo Kiosk (sem precisar de login)">
            <Select
              value={data.usa_pwa ? "sim" : "nao"}
              onValueChange={(v) => {
                const usa = v === "sim";
                setData({ ...data, usa_pwa: usa, ...(usa ? {} : { email: "" }) });
              }}
              disabled={isView}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não — só Kiosk (facial/PIN)</SelectItem>
                <SelectItem value="sim">Sim — login pessoal no PWA</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Email (login)" hint={data.usa_pwa ? "Obrigatório quando usa PWA pessoal" : "Não é necessário se não usa PWA"}>
            <Input
              type="email"
              value={data.email || ""}
              onChange={(e) => set("email", e.target.value)}
              disabled={isView || !data.usa_pwa}
              placeholder={data.usa_pwa ? "" : "—"}
            />
          </Field>
          <Field label="Data admissão"><Input type="date" value={data.data_admissao || ""} onChange={(e) => set("data_admissao", e.target.value)} disabled={isView} /></Field>
          <Field label="Cargo">
            <Select value={data.cargo_id || "__none__"} onValueChange={(v) => set("cargo_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {cargos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loja"><LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} /></Field>
          <Field label="Perfil PWA" required>
            <Select value={data.perfil_pwa} onValueChange={(v) => set("perfil_pwa", v)} disabled={isView || !data.usa_pwa}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" required>
            <Select value={data.status} onValueChange={(v) => set("status", v)} disabled={isView}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Salário (R$)">
            <Input type="number" step="0.01" value={data.salario ?? ""} onChange={(e) => set("salario", parseFloat(e.target.value) || 0)} disabled={isView} />
          </Field>
          <Field label="Data desligamento">
            <Input type="date" value={data.data_desligamento || ""} onChange={(e) => set("data_desligamento", e.target.value)} disabled={isView} />
          </Field>
          <Field label="PIN ponto (Kiosk)" hint="4-6 dígitos para identificação no tablet">
            <Input value={data.pin_ponto || ""} onChange={(e) => set("pin_ponto", e.target.value.replace(/\D/g, ""))} disabled={isView} maxLength={6} />
          </Field>
          <Field label="Endereço" className="col-span-2">
            <Input value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} disabled={isView} />
          </Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={isView} />
          </Field>

          {data.id && (
            <div className="col-span-2 pt-3 mt-1 border-t border-border">
              <SecaoFacialColaborador colaborador={data} onUpdated={recarregar} disabled={isView} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && <Button onClick={salvar} disabled={saving || !data.nome}>{saving ? "..." : "Salvar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}