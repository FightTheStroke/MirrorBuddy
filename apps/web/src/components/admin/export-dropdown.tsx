"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportToCSV,
  exportToJSON,
  type ExportColumnDef,
} from "@/lib/admin/export-utils";

interface ExportDropdownProps {
  data: unknown[];
  columns: ExportColumnDef[];
  filenamePrefix: string;
}

export function ExportDropdown({
  data,
  columns,
  filenamePrefix,
}: ExportDropdownProps) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}-${timestamp}`;

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(data, columns, filename)}
        disabled={data.length === 0}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToJSON(data, filename)}
        disabled={data.length === 0}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        JSON
      </Button>
    </div>
  );
}
