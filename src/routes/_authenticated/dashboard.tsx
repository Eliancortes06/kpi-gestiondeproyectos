import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, Cell, CartesianGrid,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { indicadoresQuery, motivosQuery, type Motivo } from "@/lib/queries";
import { buildSeriesByMotivo, enrich, uniquePeriods } from "@/lib/analytics";
import { MONTH_SHORT_ES, MONTH_NAMES_ES, periodLabel } from "@/lib/periods";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DEFAULT_FILTERS, FiltersBar, type Filters } from "@/components/dashboard/FiltersBar";
import { exportElementToPDF } from "@/lib/exports";
import { CumplimientoSection } from "@/components/dashboard/CumplimientoSection";
import { toast } from "sonner";

const proyectosMotivoQuery = () => ({
  queryKey: ["proyectos-motivo-mensual"],
  queryFn: async () => {
    const { data, error } = await (supabase as any)
      .from("proyectos_seguimiento")
      .select("anio,mes,motivo");
    if (error) throw error;
    return (data ?? []) as { anio: number; mes: number; motivo: string | null }[];
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(indicadoresQuery());
  },
  component: DashboardPage,
});

const MOTIVO_ALIASES: Record<string, string> = {
  "ok": "on time",
  "definiciones del cliente": "customer definitions",
  "definicion del cliente": "customer definitions",
  "cambio de requerimiento del cliente": "customer definitions",
  "faltantes": "missing components",
  "componentes faltantes": "missing components",
  "chasis": "chassis",
  "mano de obra": "labor",
  "tanque": "tank",
  "logistica": "logistics",
  "logística": "logistics",
  "assembly + sub-assembly": "sub-assembly",
  "assembly": "sub-assembly",
  "sub assembly": "sub-assembly",
  "subassembly": "sub-assembly",
};

function normalizeMotivo(s: string | null | undefined): string {
  const v = (s ?? "").trim().toLowerCase();
  if (!v) return "";
  return MOTIVO_ALIASES[v] ?? v;
}

function DashboardPage() {
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: indicadores } = useSuspenseQuery(indicadoresQuery());
  const { data: proyectosMotivos = [] } = useQuery(proyectosMotivoQuery());
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedMotivo, setSelectedMotivo] = useState<Motivo | null>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  // Indicadores derivados desde proyectos: % por motivo = count(motivo)/total del mes * 100
  // Para meses sin proyectos cargados, se usa la data manual de indicadores_mensuales (tendencia histórica).
  const indicadoresFromProyectos = useMemo(() => {
    const motivoByName = new Map(motivos.map((m) => [m.nombre.toLowerCase(), m]));
    const byPeriod = new Map<string, { anio: number; mes: number; total: number; counts: Map<string, number> }>();
    for (const p of proyectosMotivos) {
      if (!p.anio || !p.mes) continue;
      const norm = normalizeMotivo(p.motivo);
      const motivo = motivoByName.get(norm);
      if (!motivo) continue;
      const key = `${p.anio}-${p.mes}`;
      let g = byPeriod.get(key);
      if (!g) { g = { anio: p.anio, mes: p.mes, total: 0, counts: new Map() }; byPeriod.set(key, g); }
      g.total += 1;
      g.counts.set(motivo.id, (g.counts.get(motivo.id) ?? 0) + 1);
    }
    const out: typeof indicadores = [];
    const periodsWithProjects = new Set<string>();
    for (const g of byPeriod.values()) {
      periodsWithProjects.add(`${g.anio}-${g.mes}`);
      for (const m of motivos) {
        const c = g.counts.get(m.id) ?? 0;
        const pct = g.total > 0 ? (c / g.total) * 100 : 0;
        out.push({
          id: `${g.anio}-${g.mes}-${m.id}`,
          anio: g.anio,
          mes: g.mes,
          motivo_id: m.id,
          porcentaje: Number(pct.toFixed(2)),
          observaciones: null,
          created_at: "",
          updated_at: "",
        });
      }
    }
    // Fallback: incluir indicadores manuales de meses sin proyectos cargados (tendencia histórica)
    for (const r of indicadores) {
      if (!periodsWithProjects.has(`${r.anio}-${r.mes}`)) {
        out.push(r);
      }
    }
    return out;
  }, [proyectosMotivos, motivos, indicadores]);

  const allPeriods = useMemo(() => uniquePeriods(indicadoresFromProyectos), [indicadoresFromProyectos]);
  const years = useMemo(
    () => [...new Set(allPeriods.map((p) => p.anio))].sort((a, b) => a - b),
    [allPeriods],
  );

  const filteredRows = useMemo(() => {
    return indicadoresFromProyectos.filter((r) => {
      if (filters.anio !== "all" && String(r.anio) !== filters.anio) return false;
      if (filters.mes !== "all" && String(r.mes) !== filters.mes) return false;
      if (filters.motivoId !== "all" && r.motivo_id !== filters.motivoId) return false;
      return true;
    });
  }, [indicadoresFromProyectos, filters]);

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
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Indicadores de gestión de proyectos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </header>

      <CumplimientoSection />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Motivos de retraso</h2>
        <p className="text-sm text-muted-foreground">Distribución de proyectos por causa de retraso.</p>
      </div>

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
              onClick={() => setSelectedMotivo(m)}
            />
          );
        })}
      </section>

      <div ref={chartsRef} className="space-y-6">
        <Card className="card-elevated p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Distribución de causas de retraso</h2>

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
                <XAxis type="number" tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} allowDecimals={false} />
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

      <MotivoProjectsDialog
        motivo={selectedMotivo}
        onClose={() => setSelectedMotivo(null)}
        filters={filters}
      />
    </div>
  );
}

type ProyectoRow = {
  id: string;
  anio: number;
  mes: number;
  project_id: string;
  project_name: string | null;
  customer: string | null;
  motivo: string | null;
  project_status: string | null;
  project_manager: string | null;
  promise_date: string | null;
};

function MotivoProjectsDialog({
  motivo,
  onClose,
  filters,
}: {
  motivo: Motivo | null;
  onClose: () => void;
  filters: Filters;
}) {
  const open = motivo != null;
  const isOnTime = motivo?.nombre.toLowerCase() === "on time";

  const { data, isLoading } = useQuery({
    queryKey: ["proyectos-por-motivo", motivo?.nombre ?? null, filters.anio, filters.mes],
    enabled: open,
    queryFn: async (): Promise<ProyectoRow[]> => {
      let q = (supabase as any)
        .from("proyectos_seguimiento")
        .select("id,anio,mes,project_id,project_name,customer,motivo,project_status,project_manager,promise_date")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .order("project_id", { ascending: true });

      if (motivo) {
        // Match by motivo name (case-insensitive). "On Time" motivo may be stored as "OK" or "On Time".
        if (isOnTime) {
          q = q.or("motivo.ilike.on time,motivo.ilike.ok");
        } else {
          q = q.ilike("motivo", motivo.nombre);
        }
      }
      if (filters.anio !== "all") q = q.eq("anio", Number(filters.anio));
      if (filters.mes !== "all") q = q.eq("mes", Number(filters.mes));

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProyectoRow[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: motivo?.color ?? "#888" }}
            />
            {isOnTime ? "Proyectos entregados a tiempo" : `Proyectos afectados: ${motivo?.nombre ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {filters.anio !== "all" || filters.mes !== "all"
              ? `Filtro: ${filters.mes !== "all" ? MONTH_NAMES_ES[Number(filters.mes) - 1] + " " : ""}${filters.anio !== "all" ? filters.anio : "todos los años"}`
              : "Todos los periodos"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : !data || data.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay proyectos registrados para este motivo.
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha promesa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {MONTH_SHORT_ES[r.mes - 1]} {r.anio}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.project_id}</div>
                      {r.project_name && (
                        <div className="text-xs text-muted-foreground">{r.project_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.customer ?? "—"}</TableCell>
                    <TableCell>
                      {r.project_status ? (
                        <Badge variant="outline" className="text-xs">{r.project_status}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.project_manager ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{r.promise_date ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          {data ? `${data.length} proyecto(s)` : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  boxShadow: "0 4px 20px -4px rgb(31 63 94 / 0.12)",
  fontSize: 12,
};
