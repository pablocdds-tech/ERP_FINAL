import { useState, useMemo } from "react";
import { fmtMoeda, fmtData } from "@/lib/crm-service";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export default function ListaClientes({ clientes, onAbrirCliente }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.neighborhood || "").toLowerCase().includes(q) ||
      c.sabores_favoritos.some((s) => s.nome.toLowerCase().includes(q))
    );
  }, [clientes, busca]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente, telefone, bairro ou sabor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Favoritos</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">Último</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente.</TableCell></TableRow>
              )}
              {filtrados.map((c) => (
                <TableRow key={c.phone} className="cursor-pointer" onClick={() => onAbrirCliente(c.phone)}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}{c.neighborhood ? ` · ${c.neighborhood}` : ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {c.sabores_favoritos.slice(0, 3).map((s) => (
                        <Badge key={s.nome} variant="outline" className="font-normal text-[11px]">{s.nome}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{c.dia_preferido ? <Badge variant="secondary" className="font-normal">{c.dia_preferido}</Badge> : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.pedidos}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmtMoeda(c.total_gasto)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtData(c.ultimo_pedido)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}