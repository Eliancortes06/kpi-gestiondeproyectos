import type { Indicador, Motivo } from "./queries";
import { comparePeriod, periodKey } from "./periods";

export type EnrichedRow = Indicador & { motivo: string; color: string };

export function enrich(indicadores: Indicador[], motivos: Motivo[]): EnrichedRow[] {
  const map = new Map(motivos.map((m) => [m.id, m]));
  return indicadores.map((i) => {
    const m = map.get(i.motivo_id);
    return { ...i, motivo: m?.nombre ?? "—", color: m?.color ?? "#575657" };
  });
}

export type Period = { anio: number; mes: number };

export function uniquePeriods(rows: Indicador[]): Period[] {
  const set = new Map<number, Period>();
  for (const r of rows) set.set(periodKey(r.anio, r.mes), { anio: r.anio, mes: r.mes });
  return [...set.values()].sort(comparePeriod);
}

export type SeriesPoint = { anio: number; mes: number; label: string; value: number | null };

/**
 * Build a series per motivo across a set of periods.
 * Returns { [motivoId]: SeriesPoint[] }
 */
export function buildSeriesByMotivo(
  rows: EnrichedRow[],
  periods: Period[],
  labelFn: (p: Period) => string,
): Record<string, SeriesPoint[]> {
  const byMotivoPeriod = new Map<string, number>();
  for (const r of rows) {
    byMotivoPeriod.set(`${r.motivo_id}|${periodKey(r.anio, r.mes)}`, r.porcentaje);
  }
  const out: Record<string, SeriesPoint[]> = {};
  const motivoIds = [...new Set(rows.map((r) => r.motivo_id))];
  for (const mid of motivoIds) {
    out[mid] = periods.map((p) => {
      const v = byMotivoPeriod.get(`${mid}|${periodKey(p.anio, p.mes)}`);
      return { anio: p.anio, mes: p.mes, label: labelFn(p), value: v ?? null };
    });
  }
  return out;
}

/**
 * Filter rows to the last N months relative to the latest period in the data.
 */
export function lastNMonths(rows: Indicador[], n: number): Indicador[] {
  const periods = uniquePeriods(rows);
  if (periods.length === 0) return [];
  const tail = periods.slice(-n);
  const min = periodKey(tail[0].anio, tail[0].mes);
  return rows.filter((r) => periodKey(r.anio, r.mes) >= min);
}
