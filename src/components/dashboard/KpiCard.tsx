import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export type KpiCardProps = {
  label: string;
  value: number | null;
  previous?: number | null;
  color?: string;
  sparkline?: Array<{ label: string; value: number | null }>;
  /** true for indicators where a decrease is good (delay causes). "OK" indicator should be false. */
  lowerIsBetter?: boolean;
  onClick?: () => void;
};

export function KpiCard({
  label,
  value,
  previous,
  color = "#1F3F5E",
  sparkline,
  lowerIsBetter = true,
  onClick,
}: KpiCardProps) {
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

  return (
    <Card
      onClick={onClick}
      className={cn(
        "card-elevated cursor-pointer p-5 relative overflow-hidden",
        "animate-fade-in-up",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug min-h-[2.5rem]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {value == null ? "—" : `${value.toFixed(0)}%`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
            trendColor,
          )}
        >
          <Icon className="h-3 w-3" />
          {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp`}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {previous == null ? "No previous month" : `Previous: ${previous.toFixed(0)}%`}
      </p>

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3 h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
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
                fill={`url(#spark-${label.replace(/\s/g, "")})`}
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
