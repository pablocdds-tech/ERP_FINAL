import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const safeJson = (s) => {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s || ""; }
};

export default function LogDetalheDialog({ log, onOpenChange }) {
  if (!log) return null;
  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>Detalhe do log</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Data/hora" v={log.data_hora ? format(new Date(log.data_hora), "dd/MM/yyyy HH:mm:ss") : "-"} />
            <Info label="Usuário" v={log.usuario_nome || log.usuario_email || "-"} />
            <Info label="Origem" v={<Badge variant="outline">{log.origem}{log.agent_chave ? ` · ${log.agent_chave}` : ""}</Badge>} />
            <Info label="Módulo" v={<Badge variant="outline">{log.modulo}</Badge>} />
            <Info label="Ação" v={<Badge variant="outline">{log.acao}</Badge>} />
            <Info label="Status" v={log.status} />
            <Info label="Entidade" v={`${log.entidade || "-"}${log.entidade_id ? ` (${log.entidade_id})` : ""}`} />
            <Info label="Crítico" v={log.critico ? "Sim" : "Não"} />
          </div>
          {log.descricao && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Descrição</div>
              <div className="p-2 bg-muted rounded text-xs">{log.descricao}</div>
            </div>
          )}
          {log.justificativa && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Justificativa</div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">{log.justificativa}</div>
            </div>
          )}
          {(log.campos_alterados?.length > 0) && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Campos alterados</div>
              <div className="flex flex-wrap gap-1">
                {log.campos_alterados.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {log.valor_anterior && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Valor anterior</div>
                <pre className="p-2 bg-muted rounded text-[11px] overflow-auto max-h-64">{safeJson(log.valor_anterior)}</pre>
              </div>
            )}
            {log.valor_novo && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Valor novo</div>
                <pre className="p-2 bg-muted rounded text-[11px] overflow-auto max-h-64">{safeJson(log.valor_novo)}</pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, v }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}