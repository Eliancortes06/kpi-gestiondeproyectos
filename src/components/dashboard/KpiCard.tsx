import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, LineChart as LineIcon, Gauge } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type KpiCardProps = {
  label: string;
  value: number | null;
  previous?: number | null;
  color?: string;
  sparkline?: Array<{ label: string; value: number | null }>;
  /** true for indicators where a decrease is good (delay causes). "On Time" indicator should be false. */
  lowerIsBetter?: boolean;
  /** Maximum value shown on the trend chart's percentage axis. */
  yAxisMax?: number;
  onClick?: () => void;
};

export function KpiCard({
  label,
  value,
  previous,
  color = "#1F3F5E",
  sparkline,
  lowerIsBetter = true,
  yAxisMax = 100,
  onClick,
}: KpiCardProps) {
  const [view, setView] = useState<"summary" | "trend">("summary");

  const delta = value != null && previous != null ? value - previous : null;
  const trend: "up" | "down" | "flat" =
    delta == null ? "flat" : Math.abs(delta) < 0.5 ? "flat" : delta > 0 ? "up" : "down";

  const positive =
    trend === "flat"
      ? null
      : lowerIsBetter
        ? trend === "down"
        : trend === "up";

  const trendColor =
    positive === null
      ? "text-muted-foreground bg-muted"
      : positive
        ? "text-success bg-success/10"
        : "text-destructive bg-destructive/10";

  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const safeId = label.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <Card
      className={cn(
        "card-elevated p-5 relative overflow-hidden animate-fade-in-up transition-shadow hover:shadow-lg",
      )}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />

      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left group"
          title="Ver proyectos afectados"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug group-hover:text-foreground transition-colors">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {value == null ? "—" : `${value.toFixed(0)}%`}
          </p>
        </button>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              trendColor,
            )}
          >
            <Icon className="h-3 w-3" />
            {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp`}
          </span>
          {sparkline && sparkline.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView((v) => (v === "summary" ? "trend" : "summary"));
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              title={view === "summary" ? "Ver tendencia" : "Ver resumen"}
            >
              {view === "summary" ? (
                <><LineIcon className="h-3 w-3" /> Tendencia</>
              ) : (
                <><Gauge className="h-3 w-3" /> Resumen</>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {previous == null ? "Sin mes anterior" : `Mes anterior: ${previous.toFixed(0)}%`}
      </p>

      {sparkline && sparkline.length > 1 && view === "summary" && (
        <div className="mt-3 h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`spark-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.3 }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                  padding: "4px 8px",
                }}
                formatter={(v: number | string) => [`${v}%`, "Valor"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#spark-${safeId})`}
                isAnimationActive
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {sparkline && sparkline.length > 1 && view === "trend" && (
        <div className="mt-3 h-32 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id={`trend-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10 }}
                tickCount={5}
                unit="%"
                width={42}
                domain={[0, yAxisMax]}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                  padding: "4px 8px",
                }}
                formatter={(v: number | string) => [`${v}%`, label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#trend-${safeId})`}
                isAnimationActive
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
