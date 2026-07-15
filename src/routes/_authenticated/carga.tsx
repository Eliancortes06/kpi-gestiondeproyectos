import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MONTH_NAMES_ES } from "@/lib/periods";

export const Route = createFileRoute("/_authenticated/carga")({
  component: CargaPage,
});

type Row = {
  project_id: string;
  project_name: string | null;
  customer: string | null;
  motivo: string | null;
  project_status: string | null;
  project_manager: string | null;
  promise_date: string | null;
  _warnings: string[];
};

// Map possible Spanish/legacy labels to canonical English motivo names in DB.
const MOTIVO_MAP: Record<string, string> = {
  "ok": "On Time",
  "on time": "On Time",
  "diseño": "Design",
  "design": "Design",
  "faltantes": "Missing Components",
  "missing components": "Missing Components",
  "componentes faltantes": "Missing Components",
  "tanque": "Tank",
  "tank": "Tank",
  "chassis": "Chassis",
  "definiciones del cliente": "Customer Definitions",
  "customer definitions": "Customer Definitions",
  "cambio de requerimiento del cliente": "Customer Definitions",
  "mano de obra": "Labor",
  "labor": "Labor",
  "bom": "BOM",
  "assembly + sub-assembly": "Assembly + Sub-assembly",
  "assembly": "Assembly + Sub-assembly",
  "logistics": "Logistics",
  "logistica": "Logistics",
  "logística": "Logistics",
};

function normalizeMotivo(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "false") return null;
  return MOTIVO_MAP[s.toLowerCase()] ?? s;
}

function extractProjectId(projectName: string): string {
  // Formats like "T2729 - RF10KJ..." → "T2729"
  const m = projectName.trim().match(/^([A-Z]?\d+[A-Z]?)/i);
  return m ? m[1].toUpperCase() : projectName.trim().slice(0, 20);
}

function excelDateToISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const iso = `${d.y.toString().padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return iso;
  }
  const s = String(v).trim();
  if (!s) return null;
  // Already ISO-ish
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // dd/mm/yyyy or mm/dd/yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${yr}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function findKey(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((x) => x.toLowerCase().trim() === c.toLowerCase().trim());
    if (k) return row[k];
  }
  return null;
}

function CargaPage() {
  const now = new Date();
  const [anio, setAnio] = useState<string>(String(now.getFullYear()));
  const [mes, setMes] = useState<string>(String(now.getMonth() + 1));
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const stats = useMemo(() => {
    const total = rows.length;
    const withMotivo = rows.filter((r) => r.motivo).length;
    const byMotivo: Record<string, number> = {};
    for (const r of rows) {
      const k = r.motivo ?? "Sin motivo";
      byMotivo[k] = (byMotivo[k] ?? 0) + 1;
    }
    return { total, withMotivo, byMotivo };
  }, [rows]);

  function parseSheet(wb: XLSX.WorkBook, name: string) {
    const ws = wb.Sheets[name];
    if (!ws) return;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
    const parsed: Row[] = [];
    for (const r of json) {
      const projectName = findKey(r, ["Project Name", "Proyecto", "Project"]);
      if (!projectName) continue;
      const customer = findKey(r, ["Customer", "Cliente"]);
      const motivo = findKey(r, ["MOTIVO RETRASO", "Motivo", "Motivo Retraso"]);
      const status = findKey(r, ["Estado", "Status", "Project Status"]);
      const responsable = findKey(r, ["Responsable", "Project Manager", "Owner"]);
      const fecha = findKey(r, ["Fecha promesa", "Fecha promes", "Promise Date", "Fecha Promesa"]);

      const warns: string[] = [];
      const iso = excelDateToISO(fecha);
      if (fecha && !iso) warns.push("Fecha inválida");
      const normMotivo = normalizeMotivo(motivo);

      parsed.push({
        project_id: extractProjectId(String(projectName)),
        project_name: String(projectName),
        customer: customer ? String(customer) : null,
        motivo: normMotivo,
        project_status: status ? String(status) : null,
        project_manager: responsable ? String(responsable) : null,
        promise_date: iso,
        _warnings: warns,
      });
    }
    setRows(parsed);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    const first = wb.SheetNames[0];
    setSheetName(first);
    parseSheet(wb, first);
  }

  function handleSheetChange(name: string) {
    setSheetName(name);
    if (workbook) parseSheet(workbook, name);
  }

  async function handleImport() {
    if (rows.length === 0) {
      toast.error("No hay filas para importar");
      return;
    }
    setUploading(true);
    try {
      const payload = rows.map((r) => ({
        anio: Number(anio),
        mes: Number(mes),
        project_id: r.project_id,
        project_name: r.project_name,
        customer: r.customer,
        motivo: r.motivo,
        project_status: r.project_status,
        project_manager: r.project_manager,
        promise_date: r.promise_date,
      }));

      // Batch upsert to avoid payload limits
      const BATCH = 200;
      let done = 0;
      for (let i = 0; i < payload.length; i += BATCH) {
        const chunk = payload.slice(i, i + BATCH);
        const { error } = await (supabase as any)
          .from("proyectos_seguimiento")
          .upsert(chunk, { onConflict: "anio,mes,project_id" });
        if (error) throw error;
        done += chunk.length;
      }

      toast.success(`${done} proyectos importados para ${MONTH_NAMES_ES[Number(mes) - 1]} ${anio}`);
      qc.invalidateQueries();
      setRows([]);
      setFileName(null);
      setWorkbook(null);
      setSheetNames([]);
      setSheetName(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al importar");
    } finally {
      setUploading(false);
    }
  }

  const currentYear = now.getFullYear();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Carga de datos</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Importar seguimiento de proyectos</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Sube un archivo <strong>Excel (.xlsx)</strong> o <strong>CSV</strong> con las columnas:
          {" "}Project Name, Customer, MOTIVO RETRASO, Estado, Responsable, Fecha promesa.
          Selecciona el periodo (año / mes) al que corresponden los datos.
        </p>
      </header>

      <Card className="card-elevated p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Año</Label>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Mes</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <SelectItem key={m} value={String(m)}>{MONTH_NAMES_ES[m - 1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Archivo</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm hover:bg-accent/40">
              <Upload className="h-4 w-4" />
              <span className="truncate">{fileName ?? "Elegir .xlsx o .csv"}</span>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
        </div>

        {sheetNames.length > 1 && (
          <div className="space-y-1 max-w-xs">
            <Label>Hoja</Label>
            <Select value={sheetName ?? ""} onValueChange={handleSheetChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sheetNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <>
          <Card className="card-elevated p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{stats.total} filas listas</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.withMotivo} con motivo · {stats.total - stats.withMotivo} sin motivo
                  </p>
                </div>
              </div>
              <Button onClick={handleImport} disabled={uploading}>
                {uploading ? "Importando..." : `Importar a ${MONTH_NAMES_ES[Number(mes) - 1]} ${anio}`}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(stats.byMotivo).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="card-elevated p-0 overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Fecha promesa</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.project_id}</TableCell>
                      <TableCell className="text-xs max-w-[280px] truncate">{r.project_name}</TableCell>
                      <TableCell className="text-sm">{r.customer ?? "—"}</TableCell>
                      <TableCell>
                        {r.motivo ? (
                          <Badge variant="outline" className="text-xs">{r.motivo}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{r.project_status ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.project_manager ?? "—"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{r.promise_date ?? "—"}</TableCell>
                      <TableCell>
                        {r._warnings.length === 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 200 && (
              <p className="p-3 text-center text-xs text-muted-foreground border-t">
                Mostrando 200 de {rows.length} filas
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
