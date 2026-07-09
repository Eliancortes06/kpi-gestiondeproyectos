import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileImage } from "lucide-react";
import { indicadoresQuery, motivosQuery } from "@/lib/queries";
import { buildSeriesByMotivo, enrich, lastNMonths, uniquePeriods } from "@/lib/analytics";
import { comparePeriod, MONTH_SHORT_ES, periodKey, periodLabel } from "@/lib/periods";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DEFAULT_FILTERS, FiltersBar, type Filters } from "@/components/dashboard/FiltersBar";
import { exportElementToPDF, exportElementToPNG } from "@/lib/exports";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(indicadoresQuery());
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: indicadores } = useSuspenseQuery(indicadoresQuery());
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const chartsRef = useRef<HTMLDivElement>(null);

  const allPeriods = useMemo(() => uniquePeriods(indicadores), [indicadores]);
  const years = useMemo(() => [...new Set(allPeriods.map((p) => p.anio))].sort(), [allPeriods]);

  const rangeRows = useMemo(() => {
    if (filters.range === "6m") return lastNMonths(indicadores, 6);
    if (filters.range === "12m") return lastNMonths(indicadores, 12);
    if (filters.range === "year") {
      const currentYear = allPeriods.length ? allPeriods[allPeriods.length - 1].anio : new Date().getFullYear();
      return indicadores.filter((r) => r.anio === currentYear);
    }
    return indicadores;
  }, [indicadores, filters.range, allPeriods]);

  const filteredRows = useMemo(() => {
    return rangeRows.filter((r) => {
      if (filters.anio !== "all" && String(r.anio) !== filters.anio) return false;
      if (filters.mes !== "all" && String(r.mes) !== filters.mes) return false;
      if (filters.motivoId !== "all" && r.motivo_id !== filters.motivoId) return false;
      return true;
    });
  }, [rangeRows, filters]);

  const periods = useMemo(() => uniquePeriods(filteredRows), [filteredRows]);
  const enriched = useMemo(() => enrich(filteredRows, motivos), [filteredRows, motivos]);
  const seriesByMotivo = useMemo(
    () => buildSeriesByMotivo(enriched, periods, (p) => periodLabel(p.anio, p.mes)),
    [enriched, periods],
  );

  const latest = periods[periods.length - 1];
  const previous = periods[periods.length - 2];

  const stackedData = useMemo(() => {
    return periods.map((p) => {
      const row: Record<string, number | string> = { label: periodLabel(p.anio, p.mes) };
      for (const m of motivos) {
        const s = seriesByMotivo[m.id]?.find((x) => x.anio === p.anio && x.mes === p.mes);
        row[m.nombre] = s?.value ?? 0;
      }
      return row;
    });
  }, [periods, motivos, seriesByMotivo]);

  const yearCompareData = useMemo(() => {
    // Group by month, show one series per year
    const byMonth: Record<number, Record<string, number>> = {};
    for (const p of periods) {
      byMonth[p.mes] = byMonth[p.mes] ?? {};
    }
    // total delay = 100 - On Time for each period
    const okMotivo = motivos.find((m) => m.nombre.toLowerCase() === "on time");
    for (const p of periods) {
      const ok = enriched.find((r) => r.anio === p.anio && r.mes === p.mes && r.motivo_id === okMotivo?.id);
      byMonth[p.mes] = byMonth[p.mes] ?? {};
      byMonth[p.mes][String(p.anio)] = ok?.porcentaje ?? 0;
    }
    return Object.keys(byMonth)
      .map((m) => ({
        label: MONTH_SHORT_ES[Number(m) - 1],
        mes: Number(m),
        ...byMonth[Number(m)],
      }))
      .sort((a, b) => a.mes - b.mes);
  }, [periods, motivos, enriched]);

  async function handleExportPNG() {
    if (!chartsRef.current) return;
    try {
      await exportElementToPNG(chartsRef.current, `dashboard-${Date.now()}.png`);
      toast.success("Imagen exportada");
    } catch { toast.error("No se pudo exportar"); }
  }
  async function handleExportPDF() {
    if (!chartsRef.current) return;
    try {
      await exportElementToPDF(chartsRef.current, `dashboard-${Date.now()}.pdf`);
      toast.success("PDF generado");
    } catch { toast.error("No se pudo exportar"); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Dashboard Ejecutivo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Cumplimiento & Causas de Retraso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {latest ? `Último periodo: ${periodLabel(latest.anio, latest.mes, false)}` : "Sin datos"}
            {previous ? ` · comparado con ${periodLabel(previous.anio, previous.mes, false)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPNG}><FileImage className="mr-2 h-4 w-4" />PNG</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </header>

      <FiltersBar filters={filters} onChange={setFilters} motivos={motivos} years={years} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {motivos.filter((m) => m.activo).map((m) => {
          const series = seriesByMotivo[m.id] ?? [];
          const value = latest ? series.find((s) => s.anio === latest.anio && s.mes === latest.mes)?.value ?? null : null;
          const prev = previous ? series.find((s) => s.anio === previous.anio && s.mes === previous.mes)?.value ?? null : null;
          const isOk = m.nombre.toLowerCase() === "ok";
          return (
            <KpiCard
              key={m.id}
              label={m.nombre === "OK" ? "Proyectos entregados a tiempo" : m.nombre}
              value={value}
              previous={prev}
              color={m.color}
              sparkline={series}
              lowerIsBetter={!isOk}
            />
          );
        })}
      </section>

      <div ref={chartsRef} className="space-y-6">
        <Card className="card-elevated p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Evolución mensual — todas las causas</h2>
              <p className="text-sm text-muted-foreground">Gráfica de barras apiladas por motivo.</p>
            </div>
          </div>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {motivos.filter((m) => m.activo).map((m) => (
                  <Bar key={m.id} dataKey={m.nombre} stackId="a" fill={m.color} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="card-elevated p-5">
            <h3 className="text-lg font-semibold tracking-tight">Tendencia de cumplimiento (OK)</h3>
            <p className="text-sm text-muted-foreground">Porcentaje de proyectos entregados a tiempo por mes.</p>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stackedData.map((d) => ({ label: d.label, OK: d.OK }))}
                  margin={{ top: 8, right: 16, bottom: 8, left: -8 }}
                >
                  <defs>
                    <linearGradient id="okgrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "OK"]} />
                  <Area type="monotone" dataKey="OK" stroke="#22c55e" strokeWidth={2.5} fill="url(#okgrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="card-elevated p-5">
            <h3 className="text-lg font-semibold tracking-tight">Top causas de retraso</h3>
            <p className="text-sm text-muted-foreground">Promedio en el periodo seleccionado.</p>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topCausesData(motivos, seriesByMotivo)}
                  margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, "Promedio"]} />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                    {motivos.map((m) => (
                      <Bar key={m.id} dataKey="avg" fill={m.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="card-elevated p-5">
          <h3 className="text-lg font-semibold tracking-tight">Comparativo por año</h3>
          <p className="text-sm text-muted-foreground">Cumplimiento (OK) mes a mes.</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearCompareData} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, ""]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {years.map((y, i) => (
                  <Line
                    key={y}
                    type="monotone"
                    dataKey={String(y)}
                    stroke={["#1F3F5E", "#79161D", "#22c55e", "#c9a84c"][i % 4]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <HeatmapCard motivos={motivos} periods={periods} seriesByMotivo={seriesByMotivo} />
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  boxShadow: "0 4px 20px -4px rgb(31 63 94 / 0.12)",
  fontSize: 12,
};

function topCausesData(
  motivos: { id: string; nombre: string; color: string }[],
  seriesByMotivo: Record<string, { value: number | null }[]>,
) {
  return motivos
    .filter((m) => m.nombre.toLowerCase() !== "ok")
    .map((m) => {
      const values = (seriesByMotivo[m.id] ?? []).map((s) => s.value ?? 0);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { nombre: m.nombre, avg: Number(avg.toFixed(2)), color: m.color };
    })
    .sort((a, b) => b.avg - a.avg);
}

function HeatmapCard({
  motivos,
  periods,
  seriesByMotivo,
}: {
  motivos: { id: string; nombre: string; color: string }[];
  periods: { anio: number; mes: number }[];
  seriesByMotivo: Record<string, { anio: number; mes: number; value: number | null }[]>;
}) {
  const [tab] = useState("all");
  if (periods.length === 0) return null;
  const max = 60; // scale
  return (
    <Card className="card-elevated p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Heatmap de causas</h3>
          <p className="text-sm text-muted-foreground">Intensidad por motivo y mes.</p>
        </div>
        <Tabs value={tab}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground">Motivo</th>
              {periods.map((p) => (
                <th key={periodKey(p.anio, p.mes)} className="font-medium text-muted-foreground">
                  {periodLabel(p.anio, p.mes)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {motivos.map((m) => (
              <tr key={m.id}>
                <td className="max-w-[180px] truncate pr-2 font-medium">{m.nombre}</td>
                {periods.map((p) => {
                  const v = seriesByMotivo[m.id]?.find((s) => s.anio === p.anio && s.mes === p.mes)?.value ?? 0;
                  const intensity = Math.min(v / max, 1);
                  const isOk = m.nombre.toLowerCase() === "ok";
                  const base = isOk ? "34,197,94" : v > 30 ? "121,22,29" : "31,63,94";
                  return (
                    <td
                      key={periodKey(p.anio, p.mes)}
                      className="rounded-md text-center tabular-nums"
                      style={{
                        background: `rgba(${base}, ${0.08 + intensity * 0.75})`,
                        color: intensity > 0.5 ? "white" : "inherit",
                        padding: "8px 4px",
                        minWidth: 48,
                      }}
                      title={`${m.nombre} — ${periodLabel(p.anio, p.mes, false)}: ${v}%`}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// touch unused import to keep tree-shaker happy in case of future features
void comparePeriod;
