import * as XLSX from "xlsx";
import type { EnrichedRow } from "./analytics";
import { MONTH_NAMES_ES } from "./periods";

export function exportRowsToXLSX(rows: EnrichedRow[], filename = "indicadores.xlsx") {
  const data = rows.map((r) => ({
    Año: r.anio,
    Mes: MONTH_NAMES_ES[r.mes - 1],
    Motivo: r.motivo,
    "Porcentaje (%)": r.porcentaje,
    Observaciones: r.observaciones ?? "",
    "Fecha creación": new Date(r.created_at).toLocaleString("es"),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Indicadores");
  XLSX.writeFile(wb, filename);
}

export function exportRowsToCSV(rows: EnrichedRow[], filename = "indicadores.csv") {
  const headers = ["Año", "Mes", "Motivo", "Porcentaje", "Observaciones", "FechaCreacion"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.anio,
        MONTH_NAMES_ES[r.mes - 1],
        csvEscape(r.motivo),
        r.porcentaje,
        csvEscape(r.observaciones ?? ""),
        new Date(r.created_at).toISOString(),
      ].join(","),
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportElementToPNG(el: HTMLElement, filename: string) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  });
}

export async function exportElementToPDF(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(img, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
  pdf.save(filename);
}

export async function exportRowsToPDF(rows: EnrichedRow[], filename = "indicadores.pdf") {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFontSize(16);
  pdf.text("Reporte de Indicadores", 40, 40);
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleString("es"), 40, 58);
  autoTable(pdf, {
    startY: 80,
    head: [["Año", "Mes", "Motivo", "%", "Observaciones"]],
    body: rows.map((r) => [
      r.anio,
      MONTH_NAMES_ES[r.mes - 1],
      r.motivo,
      r.porcentaje.toString(),
      r.observaciones ?? "",
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [31, 63, 94] },
  });
  pdf.save(filename);
}
