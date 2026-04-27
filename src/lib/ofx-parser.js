// Parser simples de OFX. Extrai transações de blocos <STMTTRN>...</STMTTRN>
// Retorna: [{ fitid, tipo, data, valor, descricao }]
export function parseOFX(content) {
  const out = [];
  if (!content) return out;
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = re.exec(content)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, "i").exec(block);
      return m ? m[1].trim() : "";
    };
    const trntype = get("TRNTYPE");
    const dtposted = get("DTPOSTED");
    const trnamt = get("TRNAMT");
    const fitid = get("FITID");
    const memo = get("MEMO") || get("NAME");
    const valor = parseFloat(trnamt);
    if (!Number.isFinite(valor)) continue;
    out.push({
      fitid,
      tipo: valor >= 0 ? "credito" : "debito",
      trntype,
      data: parseOFXDate(dtposted),
      valor: Math.abs(valor),
      descricao: memo || trntype || "Movimentação OFX",
    });
  }
  return out;
}

// OFX date pode ser YYYYMMDD ou YYYYMMDDHHMMSS[...] → retorna YYYY-MM-DD
function parseOFXDate(s) {
  if (!s) return new Date().toISOString().slice(0, 10);
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(s);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[1]}-${m[2]}-${m[3]}`;
}