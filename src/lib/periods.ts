export const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export const MONTH_SHORT_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const;

export function periodLabel(anio: number, mes: number, short = true) {
  const arr = short ? MONTH_SHORT_ES : MONTH_NAMES_ES;
  return `${arr[mes - 1]} ${String(anio).slice(-2)}`;
}

export function periodKey(anio: number, mes: number) {
  return anio * 100 + mes;
}

export function comparePeriod(a: { anio: number; mes: number }, b: { anio: number; mes: number }) {
  return periodKey(a.anio, a.mes) - periodKey(b.anio, b.mes);
}

export function formatPct(v: number | null | undefined, digits = 0) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

export function pctDelta(current: number, previous: number | null | undefined) {
  if (previous == null) return null;
  return current - previous;
}

export type Trend = "up" | "down" | "flat";

export function trendOf(delta: number | null, epsilon = 0.5): Trend {
  if (delta == null) return "flat";
  if (delta > epsilon) return "up";
  if (delta < -epsilon) return "down";
  return "flat";
}
