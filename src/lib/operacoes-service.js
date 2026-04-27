import { base44 } from "@/api/base44Client";

// Service único para gerar movimentações de estoque a partir de qualquer documento.
// Mantém a regra centralizada e auditável (origem_tipo + origem_id + usuario_email).

async function getUserEmail() {
  try {
    const u = await base44.auth.me();
    return u?.email || "";
  } catch {
    return "";
  }
}

export async function registrarMovimentacoes(movs) {
  if (!movs || movs.length === 0) return;
  const email = await getUserEmail();
  const payload = movs.map((m) => ({ usuario_email: email, ...m }));
  if (payload.length === 1) {
    await base44.entities.MovimentacaoEstoque.create(payload[0]);
  } else {
    await base44.entities.MovimentacaoEstoque.bulkCreate(payload);
  }
}

// Calcula saldo agregado por item × loja a partir de todas as movimentações.
// Retorna Map: `${item_id}__${loja_id}` -> { item_id, item_tipo, item_nome, loja_id, saldo }
export function calcularSaldos(movs) {
  const map = new Map();
  for (const m of movs) {
    const key = `${m.item_id}__${m.loja_id}`;
    const atual = map.get(key) || {
      item_id: m.item_id,
      item_tipo: m.item_tipo,
      item_nome: m.item_nome,
      loja_id: m.loja_id,
      saldo: 0,
    };
    const q = Number(m.quantidade) || 0;
    let delta = 0;
    switch (m.tipo) {
      case "entrada":
      case "transferencia_entrada":
      case "producao_entrada":
        delta = Math.abs(q);
        break;
      case "saida":
      case "transferencia_saida":
      case "perda":
      case "producao_saida":
        delta = -Math.abs(q);
        break;
      case "ajuste":
      case "inventario":
        delta = q; // pode ser positivo ou negativo
        break;
      default:
        delta = 0;
    }
    atual.saldo += delta;
    map.set(key, atual);
  }
  return map;
}

export function getSaldo(saldos, item_id, loja_id) {
  return saldos.get(`${item_id}__${loja_id}`)?.saldo || 0;
}