import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { MONTH_NAMES_ES } from "@/lib/periods";
import type { Motivo } from "@/lib/queries";

// Empty array = "Todos"
export type Filters = {
  anio: string[];
  mes: string[];
  motivoId: string[];
  responsable: string[];
};

export const DEFAULT_FILTERS: Filters = { anio: [], mes: [], motivoId: [], responsable: [] };

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const summary =
    value.length === 0
      ? "Todos"
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? value[0]
        : `${value.length} seleccionados`;
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="min-w-[120px] space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{summary}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <button
            type="button"
            className="mb-1 w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={() => onChange([])}
          >
            Todos
          </button>
          <div className="max-h-64 overflow-auto">
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function FiltersBar({
  filters,
  onChange,
  motivos,
  years,
  responsables,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  motivos: Motivo[];
  years: number[];
  responsables?: string[];
}) {
  return (
    <Card className="card-elevated p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MultiSelect label="Año" value={filters.anio} onChange={(v) => onChange({ ...filters, anio: v })}
          options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        <MultiSelect label="Mes" value={filters.mes} onChange={(v) => onChange({ ...filters, mes: v })}
          options={MONTH_NAMES_ES.map((n, i) => ({ value: String(i + 1), label: n }))} />
        <MultiSelect label="Motivo" value={filters.motivoId} onChange={(v) => onChange({ ...filters, motivoId: v })}
          options={motivos.map((m) => ({ value: m.id, label: m.nombre }))} />
        {responsables && responsables.length > 0 && (
          <MultiSelect label="Responsable" value={filters.responsable} onChange={(v) => onChange({ ...filters, responsable: v })}
            options={responsables.map((r) => ({ value: r, label: r }))} />
        )}
      </div>
    </Card>
  );
}
