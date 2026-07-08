import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { indicadoresQuery, motivosQuery } from "@/lib/queries";
import { enrich } from "@/lib/analytics";
import { exportRowsToCSV, exportRowsToPDF, exportRowsToXLSX } from "@/lib/exports";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reportes")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(motivosQuery());
    context.queryClient.ensureQueryData(indicadoresQuery());
  },
  component: ReportesPage,
});

function ReportesPage() {
  const { data: motivos } = useSuspenseQuery(motivosQuery());
  const { data: indicadores } = useSuspenseQuery(indicadoresQuery());
  const rows = enrich(indicadores, motivos);

  const options: {
    key: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    action: () => Promise<void> | void;
  }[] = [
    {
      key: "xlsx",
      title: "Exportar a Excel",
      description: "Descarga todos los indicadores en un archivo .xlsx con formato tabular.",
      icon: <FileSpreadsheet className="h-6 w-6" />,
      accent: "#22c55e",
      action: () => { exportRowsToXLSX(rows, `indicadores-${Date.now()}.xlsx`); toast.success("Excel generado"); },
    },
    {
      key: "csv",
      title: "Exportar a CSV",
      description: "Descarga los datos en formato CSV listo para importar a cualquier herramienta.",
      icon: <Download className="h-6 w-6" />,
      accent: "#1F3F5E",
      action: () => { exportRowsToCSV(rows, `indicadores-${Date.now()}.csv`); toast.success("CSV generado"); },
    },
    {
      key: "pdf",
      title: "Exportar a PDF",
      description: "Genera un reporte imprimible con encabezado y tabla completa de indicadores.",
      icon: <FileText className="h-6 w-6" />,
      accent: "#79161D",
      action: async () => { await exportRowsToPDF(rows, `reporte-${Date.now()}.pdf`); toast.success("PDF generado"); },
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Reportes</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Descarga de Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total: {indicadores.length} registro{indicadores.length !== 1 ? "s" : ""} disponibles para exportar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {options.map((o) => (
          <Card key={o.key} className="card-elevated relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: o.accent }} />
            <div className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: o.accent }}>
              {o.icon}
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{o.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
            <Button className="mt-4 w-full" onClick={o.action}>Descargar</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
