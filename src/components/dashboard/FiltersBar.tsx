import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Motivo } from "@/lib/queries";

export type Filters = {
  range: "6m" | "12m" | "year" | "all";
  anio: string; // "all" or year string
  mes: string; // "all" or 1..12
  motivoId: string; // "all" or id
};

export const DEFAULT_FILTERS: Filters = {
  range: "12m",
  anio: "all",
  mes: "all",
  motivoId: "all",
};

export function FiltersBar({
  filters,
  onChange,
  motivos,
  years,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  motivos: Motivo[];
  years: number[];
}) {
  return (
    <Card className="card-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["6m", "Últimos 6 meses"],
              ["12m", "Últimos 12 meses"],
              ["year", "Año actual"],
              ["all", "Histórico"],
            ] as const
          ).map(([k, label]) => (
            <Button
              key={k}
              size="sm"
              variant={filters.range === k ? "default" : "outline"}
              onClick={() => onChange({ ...filters, range: k })}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="h-8 w-px bg-border hidden md:block" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Año</Label>
            <Select value={filters.anio} onValueChange={(v) => onChange({ ...filters, anio: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px] space-y-1">
            <Label className="text-xs text-muted-foreground">Mes</Label>
            <Select value={filters.mes} onValueChange={(v) => onChange({ ...filters, mes: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] space-y-1">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select value={filters.motivoId} onValueChange={(v) => onChange({ ...filters, motivoId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {motivos.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function applyFilters(
  rows: { anio: number; mes: number; motivo_id: string }[],
  filters: Filters,
  periods: { anio: number; mes: number }[],
): { anio: number; mes: number; motivo_id: string }[] {
  // periods param provided so caller can slice range window elsewhere.
  return rows.filter((r) => {
    if (filters.anio !== "all" && String(r.anio) !== filters.anio) return false;
    if (filters.mes !== "all" && String(r.mes) !== filters.mes) return false;
    if (filters.motivoId !== "all" && r.motivo_id !== filters.motivoId) return false;
    if (!periods.some((p) => p.anio === r.anio && p.mes === r.mes)) return false;
    return true;
  });
}
