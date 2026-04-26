/**
 * Admin table export utilities
 * CSV and JSON export with browser download trigger
 */

export interface ExportColumnDef {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(
  data: unknown[],
  columns: ExportColumnDef[],
  filename: string,
): void {
  const header = columns.map((c) => c.label).join(",");
  const rows = data.map((row) => {
    const obj = row as Record<string, unknown>;
    return columns
      .map((col) => {
        const val = col.format
          ? col.format(obj[col.key])
          : String(obj[col.key] ?? "");
        return val.includes(",") || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportToJSON(data: unknown[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(blob, `${filename}.json`);
}
