import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CumplimientoTipo = "cronograma" | "capex";

export type CumplimientoRow = {
  id: string;
  tipo: CumplimientoTipo;
  anio: number;
  mes: number;
  numerador: number;
  denominador: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type CumplimientoDef = {
  tipo: CumplimientoTipo;
  nombre: string;
  objetivo: string;
  formula: string;
  numeradorDef: string;
  denominadorDef: string;
  meta: number;
  limitePermisible: number;
  /** true = un valor menor es mejor */
  lowerIsBetter: boolean;
  color: string;
};

export const CUMPLIMIENTO_DEFS: CumplimientoDef[] = [
  {
    tipo: "cronograma",
    nombre: "Nivel de cumplimiento de cronograma de proyectos",
    objetivo: "Medir el grado de cumplimiento de los plazos establecidos para la culminación de los proyectos.",
    formula: "(Numerador / Denominador) × 100",
    numeradorDef: "Número de proyectos terminados dentro del plazo acordado",
    denominadorDef: "Número de proyectos requeridos para el mes",
    meta: 100,
    limitePermisible: 80,
    lowerIsBetter: false,
    color: "#1F3F5E",
  },
  {
    tipo: "capex",
    nombre: "Nivel de desviación del CAPEX",
    objetivo: "Evaluar la concordancia entre el CAPEX definido desde ventas y el consumo real en producción.",
    formula: "Numerador / Denominador (promedio de desviación %)",
    numeradorDef: "Suma de porcentajes de desviación negativa de los equipos en el mes",
    denominadorDef: "Total de proyectos planeados en el periodo con desviación negativa",
    meta: 0,
    limitePermisible: 10,
    lowerIsBetter: true,
    color: "#79161D",
  },
];

export function defOf(tipo: CumplimientoTipo): CumplimientoDef {
  return CUMPLIMIENTO_DEFS.find((d) => d.tipo === tipo)!;
}

/** Cálculo del LOGRO según el tipo de indicador. */
export function logroOf(row: { tipo: CumplimientoTipo; numerador: number; denominador: number }): number | null {
  const den = Number(row.denominador);
  if (!den) return null;
  const num = Number(row.numerador);
  return row.tipo === "cronograma" ? (num / den) * 100 : num / den;
}

export const cumplimientoQuery = () =>
  queryOptions({
    queryKey: ["indicadores-cumplimiento"],
    queryFn: async (): Promise<CumplimientoRow[]> => {
      const { data, error } = await (supabase as any)
        .from("indicadores_cumplimiento")
        .select("*")
        .order("anio", { ascending: true })
        .order("mes", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        numerador: Number(r.numerador),
        denominador: Number(r.denominador),
      })) as CumplimientoRow[];
    },
  });
