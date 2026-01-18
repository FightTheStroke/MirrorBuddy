/**
 * ToS Filters Component
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FiltersProps {
  versionFilter: string;
  setVersionFilter: (version: string) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (sortOrder: "asc" | "desc") => void;
  versionCounts: Record<string, number>;
  onPageReset: () => void;
}

export function Filters({
  versionFilter,
  setVersionFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  versionCounts,
  onPageReset,
}: FiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Version</label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={versionFilter}
              onChange={(e) => {
                setVersionFilter(e.target.value);
                onPageReset();
              }}
            >
              <option value="">All versions</option>
              {Object.keys(versionCounts).map((version) => (
                <option key={version} value={version}>
                  v{version}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="acceptedAt">Accepted At</option>
              <option value="version">Version</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Order</label>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
