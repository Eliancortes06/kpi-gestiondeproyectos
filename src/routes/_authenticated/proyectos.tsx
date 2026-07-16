import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { currentRoleQuery } from "@/lib/queries";
import { MONTH_NAMES_ES } from "@/lib/periods";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, Package, CalendarClock, User, Truck, Container, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proyectos")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(currentRoleQuery());
  },
  component: ProyectosPage,
});

type Proyecto = {
  id: string;
  anio: number;
  mes: number;
  project_id: string;
  project_name: string | null;
  customer: string | null;
  motivo: string | null;
  production_end_date: string | null;
  promise_date: string | null;
  project_status: string | null;
  project_manager: string | null;
  chassis_model: string | null;
  chassis_brand: string | null;
  chassis_status: string | null;
  tank_status: string | null;
  tank_vin: string | null;
  tank_date_delivery: string | null;
  l5_model: string | null;
  highlights: string | null;
};

const MOTIVOS = [
  "On Time",
  "Customer Definitions",
  "Missing Components",
  "Chassis",
  "Labor",
  "Tank",
  "Logistics",
  "BOM",
  "Sub-assembly",
  "Design",
];

function useProyectos() {
  return useQuery({
    queryKey: ["proyectos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("proyectos_seguimiento")
        .select("*")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .order("project_id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Proyecto[];
    },
  });
}

function ProyectosPage() {
  const qc = useQueryClient();
  const { data: role } = useSuspenseQuery(currentRoleQuery());
  const canEdit = role === "admin";
  const { data: proyectos = [], isLoading } = useProyectos();

  const [search, setSearch] = useState("");
  const [filterAnio, setFilterAnio] = useState<string>("all");
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterMotivo, setFilterMotivo] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Proyecto | null>(null);

  const years = useMemo(
    () => [...new Set(proyectos.map((p) => p.anio))].sort((a, b) => b - a),
    [proyectos],
  );

  const filteredByPeriod = useMemo(() => {
    return proyectos.filter((p) => {
      if (filterAnio !== "all" && String(p.anio) !== filterAnio) return false;
      if (filterMes !== "all" && String(p.mes) !== filterMes) return false;
      return true;
    });
  }, [proyectos, filterAnio, filterMes]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as Proyecto[];
    return filteredByPeriod.filter((p) =>
      p.project_id.toLowerCase().includes(q) ||
      (p.project_name ?? "").toLowerCase().includes(q) ||
      (p.customer ?? "").toLowerCase().includes(q),
    );
  }, [filteredByPeriod, search]);

  // Agrupar por project_id para ver evolución de motivos
  const grouped = useMemo(() => {
    const map = new Map<string, Proyecto[]>();
    for (const p of results) {
      const arr = map.get(p.project_id) ?? [];
      arr.push(p);
      map.set(p.project_id, arr);
    }
    return [...map.entries()].map(([pid, rows]) => ({
      project_id: pid,
      rows: rows.sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes)),
    }));
  }, [results]);

  const gridRows = useMemo(
    () => [...filteredByPeriod].sort(
      (a, b) => (b.anio - a.anio) || (b.mes - a.mes) || a.project_id.localeCompare(b.project_id),
    ),
    [filteredByPeriod],
  );

  const saveMutation = useMutation({
    mutationFn: async (input: Partial<Proyecto> & { anio: number; mes: number; project_id: string }) => {
      const payload = { ...input };
      if (editing?.id) {
        const { error } = await (supabase as any).from("proyectos_seguimiento").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("proyectos_seguimiento").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Proyecto guardado");
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("proyectos_seguimiento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Proyecto eliminado");
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Búsqueda</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca por código de proyecto (ej: T4566), nombre o cliente para ver sus indicadores.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
          </Button>
        )}
      </header>

      <Card className="card-elevated p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 h-12 text-base"
            placeholder="Buscar proyecto por código, nombre o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:max-w-lg">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Año</Label>
            <Select value={filterAnio} onValueChange={setFilterAnio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mes</Label>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MONTH_NAMES_ES.map((n, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Cargando…" : `${proyectos.length} proyectos en el sistema · ${gridRows.length} en el filtro actual`}
          {search && ` · ${grouped.length} coincidencia${grouped.length !== 1 ? "s" : ""}`}
        </p>
      </Card>

      {search.trim() !== "" && (
        grouped.length === 0 ? (
          <Card className="card-elevated p-10 text-center">
            <p className="text-sm text-muted-foreground">Sin resultados para "{search}".</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <ProjectCard
                key={g.project_id}
                projectId={g.project_id}
                rows={g.rows}
                canEdit={canEdit}
                onEdit={(p) => { setEditing(p); setOpenForm(true); }}
                onDelete={(p) => setConfirmDelete(p)}
              />
            ))}
          </div>
        )
      )}

      <Card className="card-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Todos los proyectos</h2>
            <p className="text-xs text-muted-foreground">
              {gridRows.length} registro{gridRows.length !== 1 ? "s" : ""}
              {(filterAnio !== "all" || filterMes !== "all") && " (filtrado)"}
            </p>
          </div>
        </div>
        <div className="max-h-[600px] overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : gridRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sin proyectos para el filtro seleccionado.</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>F. promesa</TableHead>
                  {canEdit && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridRows.map((r) => {
                  const tone = motivoTone(r.motivo);
                  const Icon = tone.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {MONTH_NAMES_ES[r.mes - 1]} {r.anio}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                          {r.project_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[240px] truncate" title={r.project_name ?? ""}>
                        {r.project_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.customer ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${tone.bg} ${tone.text}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {r.motivo ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.project_status ? <Badge variant="outline" className="text-xs">{r.project_status}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.project_manager ?? "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.promise_date ?? "—"}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpenForm(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>


      <ProyectoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        loading={saveMutation.isPending}
        onSubmit={(v) => saveMutation.mutate(v)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de {confirmDelete?.project_id} para {confirmDelete && MONTH_NAMES_ES[confirmDelete.mes - 1]} {confirmDelete?.anio}.
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

function motivoTone(motivo: string | null) {
  if (!motivo || motivo === "On Time" || motivo === "OK") return { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 };
  return { bg: "bg-destructive/10", text: "text-destructive", icon: AlertTriangle };
}

function ProjectCard({
  projectId, rows, canEdit, onEdit, onDelete,
}: {
  projectId: string;
  rows: Proyecto[];
  canEdit: boolean;
  onEdit: (p: Proyecto) => void;
  onDelete: (p: Proyecto) => void;
}) {
  const latest = rows[0];
  return (
    <Card className="card-elevated overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/30 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-bold text-primary">
              {projectId}
            </span>
            {latest.project_status && <Badge variant="outline">{latest.project_status}</Badge>}
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">{latest.project_name ?? "Sin nombre"}</h3>
          <p className="text-sm text-muted-foreground">{latest.customer ?? "—"}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {latest.project_manager && (
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{latest.project_manager}</span>
          )}
          {latest.chassis_model && (
            <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />{latest.chassis_brand} {latest.chassis_model}</span>
          )}
          {latest.tank_vin && (
            <span className="inline-flex items-center gap-1.5"><Container className="h-3.5 w-3.5" />Tank {latest.tank_vin}</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Prod. Real</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead>Tanque</TableHead>
              <TableHead>Chasis</TableHead>
              <TableHead className="min-w-[220px]">Highlights</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const tone = motivoTone(r.motivo);
              const Icon = tone.icon;
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {MONTH_NAMES_ES[r.mes - 1]} {r.anio}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${tone.bg} ${tone.text}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {r.motivo ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-xs">{r.production_end_date ?? "—"}</TableCell>
                  <TableCell className="tabular-nums text-xs">{r.promise_date ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.tank_status ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.chassis_status ?? "—"}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground" title={r.highlights ?? ""}>
                    {r.highlights ?? "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(r)}>
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
    </Card>
  );
}

const schema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  project_id: z.string().min(1, "Requerido").max(50),
  project_name: z.string().optional().nullable(),
  customer: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  production_end_date: z.string().optional().nullable(),
  promise_date: z.string().optional().nullable(),
  project_status: z.string().optional().nullable(),
  project_manager: z.string().optional().nullable(),
  chassis_model: z.string().optional().nullable(),
  chassis_brand: z.string().optional().nullable(),
  chassis_status: z.string().optional().nullable(),
  tank_status: z.string().optional().nullable(),
  tank_vin: z.string().optional().nullable(),
  tank_date_delivery: z.string().optional().nullable(),
  l5_model: z.string().optional().nullable(),
  highlights: z.string().optional().nullable(),
});

function ProyectoFormDialog({
  open, onOpenChange, editing, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Proyecto | null;
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const now = new Date();
  const [form, setForm] = useState<Record<string, string>>({});

  // Reset when dialog opens
  useMemo(() => {
    if (!open) return;
    setForm({
      anio: String(editing?.anio ?? now.getFullYear()),
      mes: String(editing?.mes ?? now.getMonth() + 1),
      project_id: editing?.project_id ?? "",
      project_name: editing?.project_name ?? "",
      customer: editing?.customer ?? "",
      motivo: editing?.motivo ?? "On Time",
      production_end_date: editing?.production_end_date ?? "",
      promise_date: editing?.promise_date ?? "",
      project_status: editing?.project_status ?? "",
      project_manager: editing?.project_manager ?? "",
      chassis_model: editing?.chassis_model ?? "",
      chassis_brand: editing?.chassis_brand ?? "",
      chassis_status: editing?.chassis_status ?? "",
      tank_status: editing?.tank_status ?? "",
      tank_vin: editing?.tank_vin ?? "",
      tank_date_delivery: editing?.tank_date_delivery ?? "",
      l5_model: editing?.l5_model ?? "",
      highlights: editing?.highlights ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      anio: Number(form.anio),
      mes: Number(form.mes),
      production_end_date: form.production_end_date || null,
      promise_date: form.promise_date || null,
      tank_date_delivery: form.tank_date_delivery || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    // Clean empty strings to nulls
    const cleaned = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
    ) as z.infer<typeof schema>;
    onSubmit(cleaned);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${editing.project_id}` : "Nuevo proyecto"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Año">
              <Input type="number" value={form.anio ?? ""} onChange={(e) => set("anio", e.target.value)} />
            </Field>
            <Field label="Mes">
              <Select value={form.mes} onValueChange={(v) => set("mes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_ES.map((n, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Código Proyecto">
              <Input value={form.project_id ?? ""} onChange={(e) => set("project_id", e.target.value)} placeholder="T4566" />
            </Field>
            <Field label="Motivo">
              <Select value={form.motivo} onValueChange={(v) => set("motivo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre del proyecto">
              <Input value={form.project_name ?? ""} onChange={(e) => set("project_name", e.target.value)} />
            </Field>
            <Field label="Cliente">
              <Input value={form.customer ?? ""} onChange={(e) => set("customer", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Prod. Real (fecha)">
              <Input type="date" value={form.production_end_date ?? ""} onChange={(e) => set("production_end_date", e.target.value)} />
            </Field>
            <Field label="Prometida (fecha)">
              <Input type="date" value={form.promise_date ?? ""} onChange={(e) => set("promise_date", e.target.value)} />
            </Field>
            <Field label="Entrega Tanque (fecha)">
              <Input type="date" value={form.tank_date_delivery ?? ""} onChange={(e) => set("tank_date_delivery", e.target.value)} />
            </Field>
            <Field label="Estado">
              <Input value={form.project_status ?? ""} onChange={(e) => set("project_status", e.target.value)} placeholder="In Progress" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field label="Project Manager">
              <Input value={form.project_manager ?? ""} onChange={(e) => set("project_manager", e.target.value)} />
            </Field>
            <Field label="Chasis - Marca">
              <Input value={form.chassis_brand ?? ""} onChange={(e) => set("chassis_brand", e.target.value)} />
            </Field>
            <Field label="Chasis - Modelo">
              <Input value={form.chassis_model ?? ""} onChange={(e) => set("chassis_model", e.target.value)} />
            </Field>
            <Field label="Chasis - Estado">
              <Input value={form.chassis_status ?? ""} onChange={(e) => set("chassis_status", e.target.value)} />
            </Field>
            <Field label="Tanque - Estado">
              <Input value={form.tank_status ?? ""} onChange={(e) => set("tank_status", e.target.value)} />
            </Field>
            <Field label="Tanque - VIN">
              <Input value={form.tank_vin ?? ""} onChange={(e) => set("tank_vin", e.target.value)} />
            </Field>
          </div>

          <Field label="L5 Model">
            <Input value={form.l5_model ?? ""} onChange={(e) => set("l5_model", e.target.value)} />
          </Field>

          <Field label="Highlights">
            <Textarea rows={3} value={form.highlights ?? ""} onChange={(e) => set("highlights", e.target.value)} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
