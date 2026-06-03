import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { crmService } from "@/lib/crm-service";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Users, TrendingUp, ShoppingBag } from "lucide-react";
import { fmtMoeda } from "@/lib/crm-service";
import BuscaSabor from "@/components/crm/BuscaSabor";
import ListaClientes from "@/components/crm/ListaClientes";
import ListasOfertas from "@/components/crm/ListasOfertas";
import PerfilClienteDialog from "@/components/crm/PerfilClienteDialog";

function StatTopo({ icon: Icon, label, value }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-base font-semibold">{value}</div>
      </div>
    </Card>
  );
}

export default function CrmClientes() {
  const [clientePhone, setClientePhone] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-perfis"],
    queryFn: crmService.perfis,
  });

  const clientes = data?.clientes || [];
  const ltvTotal = clientes.reduce((s, c) => s + c.total_gasto, 0);
  const pedidosTotal = clientes.reduce((s, c) => s + c.pedidos, 0);

  const abrirCliente = (phone) => {
    setClientePhone(phone);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="CRM de Clientes"
        description="Conheça a jornada de cada cliente: o que pede, em quais dias, com que frequência e o LTV — para fazer ofertas certeiras."
      />

      {isLoading ? (
        <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Analisando pedidos de todos os canais...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <StatTopo icon={Users} label="Clientes" value={clientes.length} />
            <StatTopo icon={ShoppingBag} label="Pedidos analisados" value={pedidosTotal} />
            <StatTopo icon={TrendingUp} label="LTV total da base" value={fmtMoeda(ltvTotal)} />
          </div>

          <Tabs defaultValue="busca">
            <TabsList>
              <TabsTrigger value="busca">Buscar por sabor</TabsTrigger>
              <TabsTrigger value="clientes">Todos os clientes</TabsTrigger>
              <TabsTrigger value="ofertas">Listas para ofertas</TabsTrigger>
            </TabsList>
            <TabsContent value="busca" className="mt-4">
              <BuscaSabor onAbrirCliente={abrirCliente} />
            </TabsContent>
            <TabsContent value="clientes" className="mt-4">
              <ListaClientes clientes={clientes} onAbrirCliente={abrirCliente} />
            </TabsContent>
            <TabsContent value="ofertas" className="mt-4">
              <ListasOfertas clientes={clientes} onAbrirCliente={abrirCliente} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <PerfilClienteDialog phone={clientePhone} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}