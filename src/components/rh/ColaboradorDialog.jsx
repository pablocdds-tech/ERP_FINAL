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
import LinkCadastroFacial from "@/components/rh/LinkCadastroFacial";
import { formatarCpf, limparCpf } from "@/lib/cpf-validator";
import { validarColaboradorParaSalvar } from "@/lib/colaborador-validator";
import { registrarLog } from "@/lib/auditoria-service";

const empty = () => ({
  nome: "", cpf: "", email: "", telefone: "",
  cargo_id: "", loja_id: "",
  departamento_id: "", time_id: "", centro_custo_id: "",
  jornada_id: "",
  data_admissao: "",
  perfil_pwa: "funcionario", usa_pwa: false,
  pode_bater_ponto_pelo_pwa: false,
  pode_bater_ponto_pelo_kiosk: true,
  bloqueado_para_ponto: false,
  bloqueado_motivo: "",
  status: "ativo", salario: 0, endereco: "", observacoes: "",
});

export default function ColaboradorDialog({ open, mode, record, onClose, onSaved }) {
  const [data, setData] = useState(empty());
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [times, setTimes] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erros, setErros] = useState({});
  const [avisoReativar, setAvisoReativar] = useState(null);
  const [pinNovo, setPinNovo] = useState("");
  const [pinSalvando, setPinSalvando] = useState(false);
  const [pinMsg, setPinMsg] = useState(null);
  const isView = mode === "view";

  useEffect(() => {
    if (open) {
      // Mostra CPF formatado ao abrir; sempre salvamos limpo
      const inicial = record ? { ...record, cpf: formatarCpf(record.cpf) } : empty();
      setData(inicial);
      setErros({});
      setAvisoReativar(null);
      setPinNovo("");
      setPinMsg(null);
      base44.entities.Cargo.filter({ ativo: true }).then(setCargos);
      base44.entities.Departamento.filter({ ativo: true }).then(setDepartamentos).catch(() => setDepartamentos([]));
      base44.entities.Time.filter({ ativo: true }).then(setTimes).catch(() => setTimes([]));
      base44.entities.CentroCusto.filter({ ativo: true }).then(setCentrosCusto).catch(() => setCentrosCusto([]));
      base44.entities.JornadaTrabalho.filter({ ativo: true }).then(setJornadas).catch(() => setJornadas([]));
    }
  }, [open, record]);

  const set = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const onChangeCpf = (v) => {
    set("cpf", formatarCpf(v));
  };

  const salvar = async () => {
    setSaving(true);
    const validacao = await validarColaboradorParaSalvar(data, record?.id || null);
    if (!validacao.ok) {
      setErros(validacao.erros);
      setAvisoReativar(null);
      setSaving(false);
      return;
    }
    setAvisoReativar(validacao.sugestaoReativar || null);

    // Nunca persistir pin_ponto em texto via update direto — PIN tem fluxo dedicado
    // eslint-disable-next-line no-unused-vars
    const { pin_ponto, pin_ponto_hash, pin_ponto_salt, pin_ponto_versao, ...safe } = data;
    // Salva CPF apenas com dígitos
    const payload = { ...safe, cpf: validacao.cpfDigitos };
    const cpfAnterior = limparCpf(record?.cpf);
    const cpfMudou = cpfAnterior !== validacao.cpfDigitos;

    let salvo;
    if (record?.id) {
      const { id, ...rest } = payload;
      salvo = await base44.entities.Colaborador.update(id, rest);
    } else {
      salvo = await base44.entities.Colaborador.create(payload);
    }

    // Auditoria de CPF criado/alterado
    if (cpfMudou) {
      try {
        await registrarLog({
          modulo: "rh",
          acao: record?.id ? "atualizar" : "criar",
          entidade: "Colaborador",
          entidade_id: salvo?.id || record?.id,
          descricao: record?.id
            ? `CPF alterado para ${data.nome}`
            : `CPF cadastrado para ${data.nome}`,
          origem: "humano",
          valor_anterior: record?.id ? { cpf_final4: cpfAnterior.slice(-4) } : undefined,
          valor_novo: { cpf_final4: validacao.cpfDigitos.slice(-4) },
          loja_id: data.loja_id,
          critico: false,
        });
      } catch { /* */ }
    }

    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const salvarPin = async (pinValue) => {
    if (!data.id) return;
    setPinSalvando(true);
    setPinMsg(null);
    try {
      const res = await base44.functions.invoke("setColaboradorPin", {
        colaborador_id: data.id, pin: pinValue,
      });
      const out = res?.data || {};
      if (!out.ok) {
        setPinMsg({ tipo: "erro", texto: out.motivo || "Falha ao salvar PIN." });
      } else {
        setPinMsg({ tipo: "ok", texto: pinValue ? "PIN atualizado." : "PIN removido." });
        setPinNovo("");
        // recarrega para refletir pin_ponto_versao
        const fresh = await base44.entities.Colaborador.filter({ id: data.id });
        if (fresh[0]) setData({ ...fresh[0] });
      }
    } catch (e) {
      setPinMsg({ tipo: "erro", texto: e?.message || "Erro ao salvar PIN." });
    } finally {
      setPinSalvando(false);
    }
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
          <Field label="Nome completo" required className="col-span-2">
            <Input
              value={data.nome}
              onChange={(e) => set("nome", e.target.value)}
              disabled={isView}
              className={erros.nome ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {erros.nome && <div className="text-[11px] text-destructive mt-1">{erros.nome}</div>}
          </Field>
          <Field label="CPF" required>
            <Input
              value={data.cpf || ""}
              onChange={(e) => onChangeCpf(e.target.value)}
              disabled={isView}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className={erros.cpf ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {erros.cpf && <div className="text-[11px] text-destructive mt-1">{erros.cpf}</div>}
            {avisoReativar && !erros.cpf && (
              <div className="text-[11px] text-amber-700 mt-1">
                Existe colaborador desligado com este CPF ({avisoReativar.nome}). Considere reativar o cadastro antigo.
              </div>
            )}
          </Field>
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
          <Field label="Loja" required>
            <LojaSingleSelect value={data.loja_id} onChange={(v) => set("loja_id", v)} />
            {erros.loja_id && <div className="text-[11px] text-destructive mt-1">{erros.loja_id}</div>}
          </Field>
          <Field label="Departamento">
            <Select value={data.departamento_id || "__none__"} onValueChange={(v) => set("departamento_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Time / Setor">
            <Select value={data.time_id || "__none__"} onValueChange={(v) => set("time_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {times
                  .filter((t) => !data.departamento_id || !t.departamento_id || t.departamento_id === data.departamento_id)
                  .filter((t) => !data.loja_id || !t.loja_id || t.loja_id === data.loja_id)
                  .map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Centro de Custo">
            <Select value={data.centro_custo_id || "__none__"} onValueChange={(v) => set("centro_custo_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {centrosCusto
                  .filter((cc) => !data.loja_id || !cc.loja_id || cc.loja_id === data.loja_id)
                  .map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jornada de trabalho" hint="Define carga diária, tolerâncias e horários esperados no espelho de ponto.">
            <Select value={data.jornada_id || "__none__"} onValueChange={(v) => set("jornada_id", v === "__none__" ? "" : v)} disabled={isView}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhuma —</SelectItem>
                {jornadas.map((j) => <SelectItem key={j.id} value={j.id}>{j.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
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
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Bater ponto pelo PWA?" hint="Funcionário comum: Não. Liberar apenas para gestor/líder autorizado.">
            <Select
              value={data.pode_bater_ponto_pelo_pwa ? "sim" : "nao"}
              onValueChange={(v) => set("pode_bater_ponto_pelo_pwa", v === "sim")}
              disabled={isView}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não — só Kiosk</SelectItem>
                <SelectItem value="sim">Sim — pode bater pelo celular</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bater ponto pelo Kiosk?" hint="Padrão para funcionário de loja.">
            <Select
              value={data.pode_bater_ponto_pelo_kiosk === false ? "nao" : "sim"}
              onValueChange={(v) => set("pode_bater_ponto_pelo_kiosk", v === "sim")}
              disabled={isView}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bloqueado para ponto?" hint="Bloqueia ponto sem desligar o colaborador.">
            <Select
              value={data.bloqueado_para_ponto ? "sim" : "nao"}
              onValueChange={(v) => set("bloqueado_para_ponto", v === "sim")}
              disabled={isView}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="sim">Sim — bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {data.bloqueado_para_ponto && (
            <Field label="Motivo do bloqueio">
              <Input value={data.bloqueado_motivo || ""} onChange={(e) => set("bloqueado_motivo", e.target.value)} disabled={isView} />
            </Field>
          )}
          <Field label="Salário (R$)">
            <Input type="number" step="0.01" value={data.salario ?? ""} onChange={(e) => set("salario", parseFloat(e.target.value) || 0)} disabled={isView} />
          </Field>
          <Field label="Data desligamento">
            <Input type="date" value={data.data_desligamento || ""} onChange={(e) => set("data_desligamento", e.target.value)} disabled={isView} />
          </Field>
          <Field label="PIN ponto (Kiosk)" hint="4-6 dígitos. O PIN é salvo apenas como hash — não fica visível depois.">
            {!data.id ? (
              <Input disabled placeholder="Salve o colaborador primeiro" />
            ) : (
              <div className="flex gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={data.pin_ponto_versao ? "PIN definido — digite para alterar" : "Definir PIN"}
                  value={pinNovo}
                  onChange={(e) => setPinNovo(e.target.value.replace(/\D/g, ""))}
                  disabled={isView || pinSalvando}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isView || pinSalvando || !pinNovo || pinNovo.length < 4}
                  onClick={() => salvarPin(pinNovo)}
                >
                  {pinSalvando ? "..." : "Salvar PIN"}
                </Button>
                {data.pin_ponto_versao && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isView || pinSalvando}
                    onClick={() => salvarPin("")}
                    className="text-destructive"
                  >
                    Remover
                  </Button>
                )}
              </div>
            )}
            {pinMsg && (
              <div className={`text-[11px] mt-1 ${pinMsg.tipo === "ok" ? "text-emerald-700" : "text-destructive"}`}>
                {pinMsg.texto}
              </div>
            )}
          </Field>
          <Field label="Endereço" className="col-span-2">
            <Input value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} disabled={isView} />
          </Field>
          <Field label="Observações" className="col-span-2">
            <Textarea rows={2} value={data.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} disabled={isView} />
          </Field>

          {data.id && (
            <div className="col-span-2 pt-3 mt-1 border-t border-border space-y-3">
              <LinkCadastroFacial />
              <SecaoFacialColaborador colaborador={data} onUpdated={recarregar} disabled={isView} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isView ? "Fechar" : "Cancelar"}</Button>
          {!isView && <Button onClick={salvar} disabled={saving}>{saving ? "..." : "Salvar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}