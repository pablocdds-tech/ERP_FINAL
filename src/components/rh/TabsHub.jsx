import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageShell from "@/components/rh/PageShell";

/**
 * Hub padrão de RH com abas. Sincroniza a aba ativa com ?tab=...
 * Cada `tabs[i]` = { value, label, icon?, content }
 */
export default function TabsHub({ title, description, tabs, defaultTab }) {
  const [sp, setSp] = useSearchParams();
  const initial = sp.get("tab") || defaultTab || tabs[0]?.value;

  const onChange = (v) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };

  return (
    <PageShell title={title} description={description}>
      <Tabs value={initial} onValueChange={onChange}>
        <TabsList className="mb-4 flex-wrap h-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-0">
            {/* Remove o PageShell interno da página filha, exibindo só o conteúdo */}
            <div className="[&_a[href='/pessoas']]:hidden [&>div>h1]:hidden [&>div>p.text-muted-foreground]:hidden">
              {t.content}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </PageShell>
  );
}