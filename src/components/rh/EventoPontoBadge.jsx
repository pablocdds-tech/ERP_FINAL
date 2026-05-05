import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { labelPonto } from "@/lib/rh-service";

/**
 * Badge compacto de um evento de ponto.
 * Mostra ícone discreto quando a batida foi feita fora da loja principal
 * (multi-loja). Não bloqueia nada — apenas sinaliza visualmente.
 */
export default function EventoPontoBadge({ registro, lojas = [] }) {
  const r = registro;
  const cls =
    r.status === "rejeitado"
      ? "border-destructive/40 text-destructive line-through"
      : r.status === "pendente_revisao"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : r.ajustado
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-emerald-300 bg-emerald-50 text-emerald-800";

  const lojaBatidaId = r.loja_batida_id || r.loja_id;
  const lojaBatida = lojas.find((l) => l.id === lojaBatidaId);
  const fora = !!r.batida_fora_loja_principal;

  const titulo = [
    `Origem: ${r.origem}`,
    lojaBatida ? `Loja batida: ${lojaBatida.nome}` : null,
    r.kiosk_device_id || r.dispositivo ? `Device: ${r.kiosk_device_id || r.dispositivo}` : null,
    fora ? "⚠ Batida fora da loja principal" : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${cls}`}
    >
      {labelPonto(r.tipo)}: {format(new Date(r.horario), "HH:mm")}
      {fora && <MapPin className="w-3 h-3 text-amber-600" aria-label="Fora da loja principal" />}
    </span>
  );
}