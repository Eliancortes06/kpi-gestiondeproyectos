import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { currentRoleQuery, indicadoresQuery, motivosQuery, type Indicador } from "@/lib/queries";
import { enrich } from "@/lib/analytics";
import { MONTH_NAMES_ES } from "@/lib/periods";
import { toast } from "sonner";
import {
  ArrowUpDown, Download, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2,
} from "lucide-react";
import { exportRowsToCSV, exportRowsToXLSX } from "@/lib/exports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicadores")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(indicadoresQuery());
    context.queryClient.ensureQueryData(currentRoleQuery());
  },
  component: IndicadoresPage,
});

const schema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  motivo_id: z.string().uuid("Selecciona un motivo"),
  porcentaje: z.number().min(0, "No puede ser negativo").max(100, "No puede superar 100%"),
  observaciones: z.string().max(500).optional().nullable(),
});

type SortKey = "anio" | "mes" | "motivo" | "porcentaje" | "created_at";

function IndicadoresPage() {
  const qc = useQueryClient();
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: indicadores } = useSuspenseQuery(indicadoresQuery());
  const { data: role } = useSuspenseQuery(currentRoleQuery());
  const canEdit = role === "admin";

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Indicador | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Indicador | null>(null);

  const [search, setSearch] = useState("");
  const [motivoFilter, setMotivoFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const enriched = useMemo(() => enrich(indicadores, motivos), [indicadores, motivos]);
  const years = useMemo(() => [...new Set(indicadores.map((i) => i.anio))].sort(), [indicadores]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return enriched
      .filter((r) => (motivoFilter === "all" ? true : r.motivo_id === motivoFilter))
      .filter((r) => (yearFilter === "all" ? true : String(r.anio) === yearFilter))
      .filter((r) => {
        if (!s) return true;
        return (
          r.motivo.toLowerCase().includes(s) ||
          (r.observaciones ?? "").toLowerCase().includes(s) ||
          String(r.anio).includes(s) ||
          MONTH_NAMES_ES[r.mes - 1].toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.key) {
          case "anio": return (a.anio - b.anio) * dir;
          case "mes": return (a.anio * 12 + a.mes - b.anio * 12 - b.mes) * dir;
          case "motivo": return a.motivo.localeCompare(b.motivo) * dir;
          case "porcentaje": return (a.porcentaje - b.porcentaje) * dir;
          case "created_at": return (a.created_at.localeCompare(b.created_at)) * dir;
        }
      });
  }, [enriched, search, motivoFilter, yearFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const saveMutation = useMutation({
    mutationFn: async (input: {
      id?: string;
      anio: number; mes: number; motivo_id: string; porcentaje: number; observaciones: string | null;
    }) => {
      // dup check
      if (!input.id) {
        const dup = indicadores.find((r) => r.anio === input.anio && r.mes === input.mes && r.motivo_id === input.motivo_id);
        if (dup) throw new Error("Ya existe un registro para este motivo en ese año y mes");
      } else {
        const dup = indicadores.find((r) => r.id !== input.id && r.anio === input.anio && r.mes === input.mes && r.motivo_id === input.motivo_id);
        if (dup) throw new Error("Ya existe un registro para este motivo en ese año y mes");
      }
      if (input.id) {
        const { error } = await supabase.from("indicadores_mensuales").update({
          anio: input.anio, mes: input.mes, motivo_id: input.motivo_id,
          porcentaje: input.porcentaje, observaciones: input.observaciones,
        }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("indicadores_mensuales").insert({
          anio: input.anio, mes: input.mes, motivo_id: input.motivo_id,
          porcentaje: input.porcentaje, observaciones: input.observaciones,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      toast.success("Registro guardado");
      setOpenForm(false); setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("indicadores_mensuales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      toast.success("Registro eliminado");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al eliminar"),
  });

  function toggleSort(k: SortKey) {
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Gestión</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Gestión de Indicadores</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registra, edita y consulta el histórico de causas de retraso.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportRowsToXLSX(filtered, "indicadores.xlsx")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportRowsToCSV(filtered, "indicadores.csv")}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo registro
            </Button>
          )}
        </div>
      </header>

      <Card className="card-elevated p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por motivo, observación, año o mes…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select value={motivoFilter} onValueChange={(v) => { setMotivoFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {motivos.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[100px]">
            <Label className="text-xs text-muted-foreground">Año</Label>
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th onClick={() => toggleSort("anio")}>Año</Th>
                <Th onClick={() => toggleSort("mes")}>Mes</Th>
                <Th onClick={() => toggleSort("motivo")}>Motivo</Th>
                <Th onClick={() => toggleSort("porcentaje")} className="text-right">%</Th>
                <TableHead>Observaciones</TableHead>
                <Th onClick={() => toggleSort("created_at")}>Registrado</Th>
                {canEdit && <TableHead className="w-[100px] text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-muted-foreground">Sin resultados con los filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{r.anio}</TableCell>
                  <TableCell>{MONTH_NAMES_ES[r.mes - 1]}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                      {r.motivo}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.porcentaje > 30 ? "destructive" : "secondary"} className="tabular-nums">
                      {r.porcentaje.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {r.observaciones || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString("es")}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span>Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      </Card>

      <IndicadorFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        motivos={motivos}
        onSubmit={(v) => saveMutation.mutate({ ...v, id: editing?.id })}
        loading={saveMutation.isPending}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro del histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Th({
  children, onClick, className,
}: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <TableHead className={cn("cursor-pointer select-none", className)} onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && <ArrowUpDown className="h-3 w-3 opacity-60" />}
      </span>
    </TableHead>
  );
}

function IndicadorFormDialog({
  open, onOpenChange, editing, motivos, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Indicador | null;
  motivos: { id: string; nombre: string }[];
  onSubmit: (v: { anio: number; mes: number; motivo_id: string; porcentaje: number; observaciones: string | null }) => void;
  loading: boolean;
}) {
  const now = new Date();
  const [anio, setAnio] = useState<number>(editing?.anio ?? now.getFullYear());
  const [mes, setMes] = useState<number>(editing?.mes ?? now.getMonth() + 1);
  const [motivoId, setMotivoId] = useState<string>(editing?.motivo_id ?? motivos[0]?.id ?? "");
  const [porcentaje, setPorcentaje] = useState<string>(editing?.porcentaje.toString() ?? "");
  const [observaciones, setObservaciones] = useState<string>(editing?.observaciones ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // reset when editing changes
  useMemoResetForm(editing, motivos, {
    setAnio, setMes, setMotivoId, setPorcentaje, setObservaciones, setErrors,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      anio: Number(anio), mes: Number(mes), motivo_id: motivoId,
      porcentaje: Number(porcentaje), observaciones: observaciones || null,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar registro" : "Nuevo registro"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input type="number" min={2000} max={2100} value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
              {errors.anio && <p className="text-xs text-destructive">{errors.anio}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mes</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_ES.map((n, i) => (<SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.mes && <p className="text-xs text-destructive">{errors.mes}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger>
              <SelectContent>
                {motivos.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
            {errors.motivo_id && <p className="text-xs text-destructive">{errors.motivo_id}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Porcentaje (0 – 100)</Label>
            <Input type="number" step="0.01" min={0} max={100} value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)} placeholder="Ej: 24.5" />
            {errors.porcentaje && <p className="text-xs text-destructive">{errors.porcentaje}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones (opcional)</Label>
            <Textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} />
          </div>

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

// Small helper hook to reset form values when the record being edited changes
function useMemoResetForm(
  editing: Indicador | null,
  motivos: { id: string }[],
  setters: {
    setAnio: (v: number) => void; setMes: (v: number) => void; setMotivoId: (v: string) => void;
    setPorcentaje: (v: string) => void; setObservaciones: (v: string) => void; setErrors: (v: Record<string, string>) => void;
  },
) {
  useMemo(() => {
    const now = new Date();
    setters.setAnio(editing?.anio ?? now.getFullYear());
    setters.setMes(editing?.mes ?? now.getMonth() + 1);
    setters.setMotivoId(editing?.motivo_id ?? motivos[0]?.id ?? "");
    setters.setPorcentaje(editing?.porcentaje?.toString() ?? "");
    setters.setObservaciones(editing?.observaciones ?? "");
    setters.setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);
}
