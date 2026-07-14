import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MONTH_NAMES_ES } from "@/lib/periods";
import type { Motivo } from "@/lib/queries";

export type Filters = {
  anio: string; // "all" or year string
  mes: string; // "all" or 1..12
  motivoId: string; // "all" or id
};

export const DEFAULT_FILTERS: Filters = {
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
                <SelectItem key={m} value={String(m)}>{MONTH_NAMES_ES[m - 1]}</SelectItem>
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
    </Card>
  );
}
