import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUp, CheckCircle2, AlertTriangle } from "lucide-react";
import PageShell from "@/components/financeiro/PageShell";
import Field from "@/components/cadastros/Field";
import { parseOFX } from "@/lib/ofx-parser";
import { format } from "date-fns";

export default function ImportarOFX() {
  const [contas, setContas] = useState([]);
  const [contaId, setContaId] = useState("");
  const [transacoes, setTransacoes] = useState([]); // [{...parsed, _selected, _existe}]
  const [arquivoNome, setArquivoNome] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fitidsExistentes, setFitidsExistentes] = useState(new Set());

  useEffect(() => {
    base44.entities.ContaBancaria.filter({ ativo: true }).then(setContas);
  }, []);

  useEffect(() => {
    if (!contaId) { setFitidsExistentes(new Set()); return; }
    base44.entities.MovimentacaoBancaria.filter({ conta_bancaria_id: contaId }).then((movs) => {
      setFitidsExistentes(new Set(movs.filter((m) => m.ofx_fitid).map((m) => m.ofx_fitid)));
    });
  }, [contaId]);

  const handleArquivo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArquivoNome(f.name);
    setResultado(null);
    const text = await f.text();
    const parsed = parseOFX(text);
    setTransacoes(parsed.map((t) => ({
      ...t,
      _selected: true,
      _existe: t.fitid && fitidsExistentes.has(t.fitid),
    })));
  };

  const toggle = (idx) => {
    setTransacoes(transacoes.map((t, i) => i === idx ? { ...t, _selected: !t._selected } : t));
  };

  const importar = async () => {
    if (!contaId) return;
    setImportando(true);
    const conta = contas.find((c) => c.id === contaId);
    const novos = transacoes
      .filter((t) => t._selected && !t._existe)
      .map((t) => ({
        conta_bancaria_id: contaId,
        tipo: t.tipo,
        data: t.data,
        valor: t.valor,
        descricao: t.descricao,
        loja_id: conta?.loja_id,
        origem_tipo: "ofx",
        ofx_fitid: t.fitid,
      }));
    if (novos.length) await base44.entities.MovimentacaoBancaria.bulkCreate(novos);
    setResultado({ importadas: novos.length, ignoradas: transacoes.length - novos.length });
    setImportando(false);
    // recarrega fitids
    if (contaId) {
      const movs = await base44.entities.MovimentacaoBancaria.filter({ conta_bancaria_id: contaId });
      setFitidsExistentes(new Set(movs.filter((m) => m.ofx_fitid).map((m) => m.ofx_fitid)));
      setTransacoes(transacoes.map((t) => ({ ...t, _existe: t.fitid && t._existe || (t.fitid && fitidsExistentes.has(t.fitid)) })));
    }
  };

  return (
    <PageShell title="Importação OFX" description="Carregue um extrato OFX, revise e importe as movimentações para a conta selecionada.">
      <Card className="p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Conta bancária" required>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Arquivo OFX">
            <Input type="file" accept=".ofx,.OFX,text/plain" onChange={handleArquivo} disabled={!contaId} />
          </Field>
        </div>
        {arquivoNome && <div className="text-xs text-muted-foreground mt-2">Arquivo: {arquivoNome} — {transacoes.length} transações encontradas</div>}
      </Card>

      {resultado && (
        <Card className={`p-3 mb-4 flex items-center gap-2 ${resultado.importadas > 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          {resultado.importadas > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-amber-700" />}
          <span className="text-sm">{resultado.importadas} importadas, {resultado.ignoradas} ignoradas (já existiam ou desmarcadas).</span>
        </Card>
      )}

      {transacoes.length > 0 && (
        <>
          <Card className="overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>FITID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map((t, idx) => (
                    <TableRow key={idx} className={t._existe ? "opacity-60" : ""}>
                      <TableCell>
                        <Checkbox checked={t._selected && !t._existe} disabled={t._existe} onCheckedChange={() => toggle(idx)} />
                      </TableCell>
                      <TableCell>{t.data ? format(new Date(t.data), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">{t.descricao}</TableCell>
                      <TableCell><span className="text-xs">{t.tipo === "credito" ? "Crédito" : "Débito"}</span></TableCell>
                      <TableCell className={`text-right font-mono ${t.tipo === "credito" ? "text-emerald-700" : "text-destructive"}`}>
                        R$ {t.valor.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-mono text-muted-foreground">{t.fitid || "—"}</span>
                        {t._existe && <span className="ml-2 text-[10px] text-amber-700">já existe</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button onClick={importar} disabled={importando || !contaId}>
              <FileUp className="w-4 h-4 mr-1.5" />
              {importando ? "Importando..." : `Importar ${transacoes.filter((t) => t._selected && !t._existe).length} novas`}
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}