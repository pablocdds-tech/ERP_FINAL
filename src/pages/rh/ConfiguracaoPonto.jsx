import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Clock, Fingerprint, Settings2, Save, RotateCcw, ShieldCheck, Tablet } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import {
  PONTO_PARAMS,
  carregarConfigPonto,
  salvarParametroPonto,
} from "@/lib/ponto-config-service";

const GRUPOS = [
  { key: "geo", titulo: "Geolocalização", descricao: "Validação por localização da batida.", icon: MapPin },
  { key: "horario", titulo: "Horário e Tolerância", descricao: "Janela aceitável em relação à escala.", icon: Clock },
  { key: "bio", titulo: "Biometria e IA", descricao: "Reconhecimento facial e detecção de fraude.", icon: Fingerprint },
  { key: "operacao", titulo: "Operação", descricao: "Kiosk e notificações.", icon: Settings2 },
  { key: "kiosk", titulo: "Kiosk — Detecção Automática", descricao: "Como o tablet fixo da loja reconhece e registra o ponto.", icon: Tablet },
];

export default function ConfiguracaoPonto() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [valores, setValores] = useState({});
  const [originais, setOriginais] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const cfg = await carregarConfigPonto();
      const v = {};
      for (const k of Object.keys(PONTO_PARAMS)) v[k] = cfg[k];
      setValores(v);
      setOriginais(v);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setValor = (chave, novo) => setValores((s) => ({ ...s, [chave]: novo }));

  const dirty = Object.keys(originais).some((k) => String(originais[k]) !== String(valores[k]));

  const salvar = async () => {
    setSaving(true);
    try {
      const alteradas = Object.keys(valores).filter((k) => String(originais[k]) !== String(valores[k]));
      for (const k of alteradas) {
        await salvarParametroPonto(k, valores[k]);
      }
      toast.success(`${alteradas.length} parâmetro(s) atualizado(s).`);
      await load();
    } catch (e) {
      toast.error("Falha ao salvar: " + (e?.message || "erro"));
    } finally {
      setSaving(false);
    }
  };

  const restaurarDefaults = () => {
    const v = {};
    for (const [k, meta] of Object.entries(PONTO_PARAMS)) {
      v[k] = meta.tipo === "bool"
        ? meta.default === "true"
        : meta.tipo === "number"
        ? Number(meta.default)
        : meta.default;
    }
    setValores(v);
    toast.message("Valores padrão carregados. Clique em Salvar para aplicar.");
  };

  return (
    <div>
      <PageHeader
        title="Configuração do Ponto Eletrônico"
        description="Defina tolerâncias, regras de validação e preferências de operação."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={restaurarDefaults} disabled={loading || saving}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Padrões
            </Button>
            <Button size="sm" onClick={salvar} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Salvar alterações
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-20 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando configurações…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {GRUPOS.map((g) => (
            <Card key={g.key} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <g.icon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{g.titulo}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{g.descricao}</p>

              <div className="space-y-4">
                {Object.entries(PONTO_PARAMS)
                  .filter(([, meta]) => meta.grupo === g.key)
                  .map(([chave, meta]) => (
                    <ParamRow
                      key={chave}
                      chave={chave}
                      meta={meta}
                      valor={valores[chave]}
                      onChange={(v) => setValor(chave, v)}
                      alterado={String(originais[chave]) !== String(valores[chave])}
                    />
                  ))}
              </div>
            </Card>
          ))}

          <Card className="p-5 lg:col-span-2 bg-muted/30">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">Profissional e auditável.</strong> Todas as alterações são gravadas
                no log de auditoria com responsável, data/hora e valores anterior/novo. Os parâmetros são consultados
                em tempo real pelo PWA, pelo Kiosk e pela validação de IA.
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ParamRow({ chave, meta, valor, onChange, alterado }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={chave} className="text-sm cursor-pointer">{meta.label}</Label>
          {alterado && <Badge variant="secondary" className="text-[10px]">alterado</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.descricao}</p>
        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{chave}</p>
      </div>
      <div className="shrink-0">
        {meta.tipo === "bool" ? (
          <Switch id={chave} checked={!!valor} onCheckedChange={onChange} />
        ) : meta.tipo === "number" ? (
          <Input
            id={chave}
            type="number"
            value={valor ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="w-28 text-right"
          />
        ) : (
          <Input
            id={chave}
            value={valor ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-40"
          />
        )}
      </div>
    </div>
  );
}