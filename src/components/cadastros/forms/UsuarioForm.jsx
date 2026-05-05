import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Field from "../Field";
import LojaSingleSelect from "../LojaSingleSelect";
import { MODULES } from "@/lib/modules";

export default function UsuarioForm({ data, onChange, readOnly }) {
  const [perfis, setPerfis] = useState([]);
  const set = (k, v) => onChange({ ...data, [k]: v });

  useEffect(() => {
    base44.entities.Perfil.list().then((d) => setPerfis(d || [])).catch(() => setPerfis([]));
  }, []);

  const perfilSelecionado = useMemo(
    () => perfis.find((p) => p.id === data.perfil_id),
    [perfis, data.perfil_id]
  );
  const permissoesPerfil = perfilSelecionado?.permissoes || [];
  const extras = data.permissoes_extras || [];
  const restritas = data.permissoes_restritas || [];

  const togglePermissao = (modId) => {
    const temNoPerfil = permissoesPerfil.includes(modId);
    const ehExtra = extras.includes(modId);
    const ehRestrita = restritas.includes(modId);
    const efetivo = (temNoPerfil && !ehRestrita) || ehExtra;

    if (efetivo) {
      // Atualmente liberado → bloquear
      if (temNoPerfil) {
        set("permissoes_restritas", [...restritas, modId]);
        if (ehExtra) set("permissoes_extras", extras.filter((x) => x !== modId));
      } else {
        set("permissoes_extras", extras.filter((x) => x !== modId));
      }
    } else {
      // Atualmente bloqueado → liberar
      if (ehRestrita) {
        onChange({
          ...data,
          permissoes_restritas: restritas.filter((x) => x !== modId),
        });
      } else {
        set("permissoes_extras", [...extras, modId]);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome">
        <Input value={data.full_name || ""} disabled />
      </Field>
      <Field label="Email">
        <Input value={data.email || ""} disabled />
      </Field>
      <Field label="Perfil de acesso (role)" required>
        <Select value={data.role || "funcionario"} onValueChange={(v) => set("role", v)} disabled={readOnly}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin Geral</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
            <SelectItem value="funcionario">Funcionário</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Perfil cadastrado">
        <Select value={data.perfil_id || "nenhum"} onValueChange={(v) => set("perfil_id", v === "nenhum" ? "" : v)} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Nenhum (usar só o role)</SelectItem>
            {perfis.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Loja vinculada">
        <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} />
      </Field>
      <Field label="Cargo">
        <Input value={data.cargo || ""} onChange={(e) => set("cargo", e.target.value)} disabled={readOnly} />
      </Field>
      <Field label="Telefone">
        <Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} />
      </Field>

      <Field label="Permissões efetivas (módulos liberados)" className="md:col-span-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-border rounded-lg">
          {MODULES.map((m) => {
            const temNoPerfil = permissoesPerfil.includes(m.id);
            const ehExtra = extras.includes(m.id);
            const ehRestrita = restritas.includes(m.id);
            const efetivo = (temNoPerfil && !ehRestrita) || ehExtra;
            const tag = ehExtra ? "+ extra" : ehRestrita ? "− bloqueado" : temNoPerfil ? "do perfil" : "";
            return (
              <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={efetivo} onCheckedChange={() => togglePermissao(m.id)} disabled={readOnly} />
                <span className="flex-1">{m.nome}</span>
                {tag && <span className="text-[10px] text-muted-foreground">{tag}</span>}
              </label>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Marque/desmarque para conceder ou revogar individualmente. As mudanças ficam registradas como extras/restrições do usuário sobre o perfil.
        </p>
      </Field>

      <p className="md:col-span-2 text-xs text-muted-foreground -mt-1">
        Novos usuários só podem entrar via convite. Aqui é possível ajustar permissões e excluir.
      </p>
    </div>
  );
}