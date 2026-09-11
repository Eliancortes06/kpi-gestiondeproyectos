import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MONTH_NAMES_ES } from "@/lib/periods";
import {
  CUMPLIMIENTO_DEFS, cumplimientoQuery, defOf, logroOf,
  type CumplimientoRow, type CumplimientoTipo,
} from "@/lib/cumplimiento";

export function CumplimientoManager({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery(cumplimientoQuery());
  const [tipoFilter, setTipoFilter] = useState<CumplimientoTipo>("cronograma");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CumplimientoRow | null>(null);

  const filtered = rows.filter((r) => r.tipo === tipoFilter);
  const def = defOf(tipoFilter);

  const save = useMutation({
    mutationFn: async (v: {
      id?: string; tipo: CumplimientoTipo; anio: number; mes: number;
      numerador: number; denominador: number; observaciones: string | null;
    }) => {
      const payload = {
        tipo: v.tipo, anio: v.anio, mes: v.mes,
        numerador: v.numerador, denominador: v.denominador, observaciones: v.observaciones,
      };
      const q = v.id
        ? (supabase as any).from("indicadores_cumplimiento").update(payload).eq("id", v.id)
        : (supabase as any).from("indicadores_cumplimiento").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicadores-cumplimiento"] });
      toast.success("Indicador guardado");
      setOpenForm(false); setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al guardar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("indicadores_cumplimiento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicadores-cumplimiento"] });
      toast.success("Registro eliminado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al eliminar"),
  });

  return (
    <Card className="card-elevated p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Indicadores de cumplimiento</h2>
          <p className="text-sm text-muted-foreground">{def.objetivo}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-[260px]">
            <Label className="text-xs text-muted-foreground">Indicador</Label>
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as CumplimientoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUMPLIMIENTO_DEFS.map((d) => (
                  <SelectItem key={d.tipo} value={d.tipo}>{d.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo mes
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Info label="Fórmula" value={def.formula} />
        <Info label="Meta" value={`${def.meta}%`} />
        <Info label="Límite permisible" value={`${def.limitePermisible}%`} />
        <Info label="Frecuencia" value="Mensual" />
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Año</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Numerador</TableHead>
              <TableHead className="text-right">Denominador</TableHead>
              <TableHead className="text-right">Logro</TableHead>
              <TableHead>Observaciones</TableHead>
              {canEdit && <TableHead className="w-[100px] text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">Sin registros para este indicador.</TableCell></TableRow>
            ) : filtered.map((r) => {
              const logro = logroOf(r);
              const ok = logro == null ? null
                : def.lowerIsBetter ? logro <= def.limitePermisible : logro >= def.limitePermisible;
              return (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{r.anio}</TableCell>
                  <TableCell>{MONTH_NAMES_ES[r.mes - 1]}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.numerador}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.denominador}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={ok === false ? "destructive" : "secondary"} className="tabular-nums">
                      {logro == null ? "—" : `${logro.toFixed(0)}%`}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">{r.observaciones || "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CumplimientoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        defaultTipo={tipoFilter}
        loading={save.isPending}
        onSubmit={(v) => save.mutate({ ...v, id: editing?.id })}
      />
    </Card>
  );
}

function CumplimientoFormDialog({
  open, onOpenChange, editing, defaultTipo, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CumplimientoRow | null;
  defaultTipo: CumplimientoTipo;
  loading: boolean;
  onSubmit: (v: {
    tipo: CumplimientoTipo; anio: number; mes: number;
    numerador: number; denominador: number; observaciones: string | null;
  }) => void;
}) {
  const now = new Date();
  const [tipo, setTipo] = useState<CumplimientoTipo>(defaultTipo);
  const [anio, setAnio] = useState<number>(now.getFullYear());
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [numerador, setNumerador] = useState("");
  const [denominador, setDenominador] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTipo(editing?.tipo ?? defaultTipo);
    setAnio(editing?.anio ?? now.getFullYear());
    setMes(editing?.mes ?? now.getMonth() + 1);
    setNumerador(editing ? String(editing.numerador) : "");
    setDenominador(editing ? String(editing.denominador) : "");
    setObservaciones(editing?.observaciones ?? "");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultTipo]);

  const def = defOf(tipo);
  const num = Number(numerador);
  const den = Number(denominador);
  const preview = den > 0 && !Number.isNaN(num)
    ? logroOf({ tipo, numerador: num, denominador: den })
    : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Number.isNaN(num) || numerador === "") return setError("Ingresa el numerador");
    if (Number.isNaN(den) || denominador === "" || den <= 0) return setError("El denominador debe ser mayor a 0");
    setError("");
    onSubmit({ tipo, anio, mes, numerador: num, denominador: den, observaciones: observaciones || null });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar mes" : "Nuevo mes"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Indicador</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as CumplimientoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUMPLIMIENTO_DEFS.map((d) => (<SelectItem key={d.tipo} value={d.tipo}>{d.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input type="number" min={2000} max={2100} value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mes</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_ES.map((n, i) => (<SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Numerador</Label>
              <Input type="number" step="0.01" value={numerador} onChange={(e) => setNumerador(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{def.numeradorDef}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Denominador</Label>
              <Input type="number" step="0.01" value={denominador} onChange={(e) => setDenominador(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{def.denominadorDef}</p>
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            Logro calculado: <span className="font-semibold tabular-nums">{preview == null ? "—" : `${preview.toFixed(1)}%`}</span>
            <span className="ml-2 text-xs text-muted-foreground">Meta {def.meta}% · Límite {def.limitePermisible}%</span>
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones (opcional)</Label>
            <Textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}
