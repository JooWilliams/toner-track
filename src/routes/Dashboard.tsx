import type * as React from "react";
import { Copy, Disc3, Droplet, Printer, TrendingUp, Trophy } from "lucide-react";
import { useDashboard } from "@/hooks/queries";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ConsumptionChart } from "@/components/ConsumptionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { formatNumber } from "@/lib/format";

function Highlight({
  icon: Icon,
  tone,
  title,
  name,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  name?: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <Icon className={`h-5 w-5 ${tone}`} />
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {name ? (
          <>
            <p className="text-lg font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) return <LoadingBlock label="Carregando indicadores…" />;
  if (isError)
    return (
      <Card className="p-6 text-sm text-danger">
        Não foi possível carregar o dashboard: {(error as Error).message}
      </Card>
    );

  const t = data!.totals;

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral de consumo, rendimento e economia dos suprimentos." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Copy} tone="indigo" label="Páginas impressas" value={formatNumber(t.pages_printed)} />
        <StatCard icon={Droplet} tone="teal" label="Toners trocados" value={formatNumber(t.toners_replaced)} />
        <StatCard icon={Disc3} tone="amber" label="Cilindros trocados" value={formatNumber(t.drums_replaced)} />
        <StatCard icon={TrendingUp} tone="emerald" label="Média p/ toner" value={formatNumber(t.avg_pages_toner)} hint="páginas" />
        <StatCard icon={TrendingUp} tone="rose" label="Média p/ cilindro" value={formatNumber(t.avg_pages_drum)} hint="páginas" />
        <StatCard icon={Printer} tone="slate" label="Impressoras" value={formatNumber(t.printers_count)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Páginas impressas são calculadas entre leituras consecutivas do contador de cada impressora; reinícios iniciam uma nova base.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Highlight
          icon={Trophy}
          tone="text-amber-500"
          title="Maior volume de impressão"
          name={t.top_volume_printer?.name}
          detail={t.top_volume_printer ? `${formatNumber(t.top_volume_printer.pages)} páginas no período` : undefined}
        />
        <Highlight
          icon={Droplet}
          tone="text-teal-500"
          title="Maior consumo de toner"
          name={t.top_toner_printer?.name}
          detail={t.top_toner_printer ? `${formatNumber(t.top_toner_printer.count)} toners substituídos` : undefined}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consumo mensal (últimos 12 meses)</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <ConsumptionChart data={data!.monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consumo anual</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <ConsumptionChart data={data!.yearly} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
