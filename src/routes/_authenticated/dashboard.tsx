import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, CartesianGrid, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage } from "lucide-react";
import { indicadoresQuery, motivosQuery } from "@/lib/queries";
import { buildSeriesByMotivo, enrich, lastNMonths, uniquePeriods } from "@/lib/analytics";
import { MONTH_SHORT_ES, periodLabel } from "@/lib/periods";
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
  const years = useMemo(
    () => [...new Set(allPeriods.map((p) => p.anio))].sort((a, b) => a - b),
    [allPeriods],
  );

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

  // Torta: promedio del periodo por motivo (excluye On Time)
  const pieData = useMemo(() => {
    return motivos
      .filter((m) => m.activo && m.nombre.toLowerCase() !== "on time")
      .map((m) => {
        const values = (seriesByMotivo[m.id] ?? []).map((s) => s.value ?? 0);
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        return { name: m.nombre, value: Number(avg.toFixed(2)), color: m.color };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [motivos, seriesByMotivo]);

  const yearCompareData = useMemo(() => {
    const byMonth: Record<number, Record<string, number>> = {};
    for (const p of periods) byMonth[p.mes] = byMonth[p.mes] ?? {};
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
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Diagnostico de retrasos</h1>
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
          const isOk = m.nombre.toLowerCase() === "on time";
          return (
            <KpiCard
              key={m.id}
              label={m.nombre}
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
              <h2 className="text-lg font-semibold tracking-tight">Distribución de causas de retraso</h2>
              <p className="text-sm text-muted-foreground">Participación promedio por motivo en el periodo (excluye On Time).</p>
            </div>
          </div>
          <div className="h-[420px]">
            {pieData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Sin datos en el periodo seleccionado.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingLeft: 16 }}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="42%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={140}
                    paddingAngle={2}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="card-elevated p-5">
            <h3 className="text-lg font-semibold tracking-tight">Tendencia de cumplimiento (On Time)</h3>
            <p className="text-sm text-muted-foreground">Porcentaje de proyectos entregados a tiempo por mes.</p>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={periods.map((p) => {
                    const okMotivo = motivos.find((m) => m.nombre.toLowerCase() === "on time");
                    const s = okMotivo ? seriesByMotivo[okMotivo.id]?.find((x) => x.anio === p.anio && x.mes === p.mes) : null;
                    return { label: periodLabel(p.anio, p.mes), "On Time": s?.value ?? 0 };
                  })}
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
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "On Time"]} />
                  <Area type="monotone" dataKey="On Time" stroke="#22c55e" strokeWidth={2.5} fill="url(#okgrad)" />
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
                  data={pieData.map((d) => ({ nombre: d.name, avg: d.value, color: d.color }))}
                  margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, "Promedio"]} />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="card-elevated p-5">
          <h3 className="text-lg font-semibold tracking-tight">Comparativo por año</h3>
          <p className="text-sm text-muted-foreground">Cumplimiento (On Time) mes a mes.</p>
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
                    stroke={["#1F3F5E", "#79161D", "#c9a84c", "#22c55e"][i % 4]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
