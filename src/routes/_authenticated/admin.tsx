import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currentRoleQuery, motivosQuery, type Motivo } from "@/lib/queries";
import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, ShieldAlert } from "lucide-react";

const usersQuery = () =>
  queryOptions({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      }
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  loader: async ({ context }) => {
    const role = await context.queryClient.ensureQueryData(currentRoleQuery());
    if (role !== "admin") throw redirect({ to: "/dashboard" });
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(usersQuery());
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: users } = useSuspenseQuery(usersQuery());

  const [openMotivo, setOpenMotivo] = useState(false);
  const [editing, setEditing] = useState<Motivo | null>(null);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#1F3F5E");
  const [activo, setActivo] = useState(true);

  function openNew() {
    setEditing(null); setNombre(""); setColor("#1F3F5E"); setActivo(true); setOpenMotivo(true);
  }
  function openEdit(m: Motivo) {
    setEditing(m); setNombre(m.nombre); setColor(m.color); setActivo(m.activo); setOpenMotivo(true);
  }

  const saveMotivo = useMutation({
    mutationFn: async () => {
      if (!nombre.trim()) throw new Error("El nombre es obligatorio");
      if (editing) {
        const { error } = await supabase.from("motivos").update({ nombre, color, activo }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const maxOrden = Math.max(0, ...motivos.map((m) => m.orden));
        const { error } = await supabase.from("motivos").insert({ nombre, color, activo, orden: maxOrden + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motivos"] });
      toast.success("Motivo guardado");
      setOpenMotivo(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "consulta" }) => {
      // remove existing
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rol actualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Administración</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Gestión de la plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administra motivos y usuarios de tu organización.</p>
      </header>

      <Card className="card-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Motivos</h2>
            <p className="text-sm text-muted-foreground">Causas de retraso monitoreadas en la plataforma.</p>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo motivo</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motivos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-md border" style={{ background: m.color }} />
                      <code className="text-xs text-muted-foreground">{m.color}</code>
                    </span>
                  </TableCell>
                  <TableCell>
                    {m.activo ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="card-elevated p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Administra roles. Los usuarios con rol <strong>consulta</strong> solo pueden visualizar la información.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Cambiar rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const role = u.roles[0] ?? "consulta";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.correo}</TableCell>
                    <TableCell>
                      {role === "admin"
                        ? <Badge>Administrador</Badge>
                        : <Badge variant="secondary">Consulta</Badge>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={role}
                        onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as "admin" | "consulta" })}
                      >
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="consulta">Consulta</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span className="text-muted-foreground">
            Los nuevos usuarios que se registren se crean con rol <strong>Consulta</strong> por defecto.
          </span>
        </div>
      </Card>

      <Dialog open={openMotivo} onOpenChange={setOpenMotivo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar motivo" : "Nuevo motivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Retraso proveedor" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-[160px] font-mono text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Motivo activo</p>
                <p className="text-xs text-muted-foreground">Los motivos inactivos no aparecen en el dashboard.</p>
              </div>
              <Switch checked={activo} onCheckedChange={setActivo} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenMotivo(false)}>Cancelar</Button>
            <Button onClick={() => saveMotivo.mutate()} disabled={saveMotivo.isPending}>
              {saveMotivo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
