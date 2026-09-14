import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MONTH_NAMES_ES, MONTH_SHORT_ES } from "@/lib/periods";
import {
  CUMPLIMIENTO_DEFS, cumplimientoQuery, defOf, logroOf,
  type CumplimientoDef, type CumplimientoRow,
} from "@/lib/cumplimiento";

export function CumplimientoSection() {
  const { data: rows = [] } = useQuery(cumplimientoQuery());
  const [selected, setSelected] = useState<CumplimientoDef | null>(null);

  const byTipo = useMemo(() => {
    const out: Record<string, CumplimientoRow[]> = {};
    for (const d of CUMPLIMIENTO_DEFS) {
      out[d.tipo] = rows
        .filter((r) => r.tipo === d.tipo)
        .sort((a, b) => a.anio * 100 + a.mes - (b.anio * 100 + b.mes));
    }
    return out;
  }, [rows]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Indicadores de cumplimiento</h2>
        <p className="text-sm text-muted-foreground">
          Cálculo mensual a partir de numerador y denominador registrados en Gestión de Indicadores.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CUMPLIMIENTO_DEFS.map((d) => {
          const series = (byTipo[d.tipo] ?? []).map((r) => ({
            label: `${MONTH_SHORT_ES[r.mes - 1]} ${String(r.anio).slice(-2)}`,
            value: logroOf(r),
          }));
          const withValue = series.filter((s) => s.value != null);
          const value = withValue.at(-1)?.value ?? null;
          const previous = withValue.at(-2)?.value ?? null;
          const yAxisMax = axisMaximum(d, withValue.map((s) => s.value ?? 0));
          return (
            <KpiCard
              key={d.tipo}
              label={d.nombre}
              value={value}
              previous={previous}
              color={d.color}
              sparkline={series}
              lowerIsBetter={d.lowerIsBetter}
              yAxisMax={yAxisMax}
              onClick={() => setSelected(d)}
            />
          );
        })}
      </div>

      <CumplimientoDialog
        def={selected}
        rows={selected ? byTipo[selected.tipo] ?? [] : []}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function CumplimientoDialog({
  def, rows, onClose,
}: { def: CumplimientoDef | null; rows: CumplimientoRow[]; onClose: () => void }) {
  const open = def != null;
  const chartData = def
    ? rows.map((r) => ({
        mes: `${MONTH_SHORT_ES[r.mes - 1]} ${String(r.anio).slice(-2)}`,
        logro: logroOf(r),
        meta: def.meta,
        limite: def.limitePermisible,
      }))
    : [];
  const yAxisMax = def ? axisMaximum(def, chartData.map((r) => r.logro ?? 0)) : 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: def?.color ?? "#888" }} />
            {def?.nombre}
          </DialogTitle>
          <DialogDescription>{def?.objetivo}</DialogDescription>
        </DialogHeader>

        {def && (
          <div className="flex-1 overflow-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Info label="Fórmula" value={def.formula} />
              <Info label="Meta" value={`${def.meta}%`} />
              <Info label="Límite permisible" value={`${def.limitePermisible}%`} />
              <Info label="Frecuencia" value="Mensual" />
              <Info label="Numerador" value={def.numeradorDef} className="col-span-2" />
              <Info label="Denominador" value={def.denominadorDef} className="col-span-2" />
            </div>

            <div className="h-[300px] rounded-md border p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickCount={6}
                    unit="%"
                    width={48}
                    domain={[0, yAxisMax]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
                    formatter={(v: number, n: string) => [`${Number(v).toFixed(1)}%`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="logro" name="Logro" stroke={def.color} strokeWidth={2.5} dot connectNulls />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke="#3AA0FF" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="limite" name="Límite permisible" stroke="#B36AC1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Numerador</TableHead>
                    <TableHead className="text-right">Denominador</TableHead>
                    <TableHead className="text-right">Logro</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Límite permisible</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Sin registros. Agrégalos desde Gestión de Indicadores.
                      </TableCell>
                    </TableRow>
                  ) : rows.map((r) => {
                    const logro = logroOf(r);
                    const ok = logro == null ? null
                      : def.lowerIsBetter ? logro <= def.limitePermisible : logro >= def.limitePermisible;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{MONTH_NAMES_ES[r.mes - 1]} {r.anio}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.numerador}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.denominador}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={ok === false ? "destructive" : "secondary"} className="tabular-nums">
                            {logro == null ? "—" : `${logro.toFixed(0)}%`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{def.meta}%</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{def.limitePermisible}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.observaciones || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function axisMaximum(def: CumplimientoDef, values: number[]) {
  if (!def.lowerIsBetter) return 100;
  const highest = Math.max(def.meta, def.limitePermisible, ...values);
  return Math.max(10, Math.ceil((highest * 1.2) / 5) * 5);
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-md border bg-muted/40 px-3 py-2 ${className ?? ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}

export { defOf };
