import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/yield";
import { formatNumber } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatNumber(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsumptionChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="pagesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.paginas} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.paginas} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="key" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={46} />
        <YAxis
          yAxisId="right"
          orientation="right"
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={26}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="paginas"
          name="Páginas"
          stroke={CHART_COLORS.paginas}
          strokeWidth={2}
          fill="url(#pagesFill)"
        />
        <Bar yAxisId="right" dataKey="toners" name="Toners" fill={CHART_COLORS.toners} radius={[3, 3, 0, 0]} barSize={12} />
        <Bar
          yAxisId="right"
          dataKey="cilindros"
          name="Cilindros"
          fill={CHART_COLORS.cilindros}
          radius={[3, 3, 0, 0]}
          barSize={12}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
