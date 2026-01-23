/**
 * Cohort Analysis Component
 * Shows weekly cohorts with conversion and retention
 * Plan 069 - Conversion Funnel Dashboard
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface CohortData {
  week: string;
  weekLabel: string;
  totalUsers: number;
  conversionToTrial: number;
  conversionToActive: number;
  retention7d: number;
  retention14d: number;
}

interface CohortsResponse {
  cohorts: CohortData[];
  period: { weeksIncluded: number };
}

function getCellColor(value: number, type: "conversion" | "retention"): string {
  if (type === "conversion") {
    if (value >= 50) return "bg-green-500 text-white";
    if (value >= 30) return "bg-green-300 text-green-900";
    if (value >= 10) return "bg-amber-200 text-amber-900";
    return "bg-red-100 text-red-900";
  }
  // retention
  if (value >= 40) return "bg-blue-500 text-white";
  if (value >= 25) return "bg-blue-300 text-blue-900";
  if (value >= 10) return "bg-blue-100 text-blue-900";
  return "bg-slate-100 text-slate-600";
}

export function CohortAnalysis() {
  const [data, setData] = useState<CohortsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/funnel/cohorts?weeks=8");
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-48 bg-slate-200 dark:bg-slate-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No cohort data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cohort Analysis
          <span className="text-sm font-normal text-muted-foreground ml-2">
            Last {data.period.weeksIncluded} weeks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Cohort</th>
                <th className="text-center p-2 font-medium">Users</th>
                <th className="text-center p-2 font-medium">Trial %</th>
                <th className="text-center p-2 font-medium">Active %</th>
                <th className="text-center p-2 font-medium">Ret. 7d</th>
                <th className="text-center p-2 font-medium">Ret. 14d</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort) => (
                <tr key={cohort.week} className="border-b last:border-0">
                  <td className="p-2 font-medium">{cohort.weekLabel}</td>
                  <td className="text-center p-2">{cohort.totalUsers}</td>
                  <td className="text-center p-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCellColor(cohort.conversionToTrial, "conversion")}`}
                    >
                      {cohort.conversionToTrial}%
                    </span>
                  </td>
                  <td className="text-center p-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCellColor(cohort.conversionToActive, "conversion")}`}
                    >
                      {cohort.conversionToActive}%
                    </span>
                  </td>
                  <td className="text-center p-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCellColor(cohort.retention7d, "retention")}`}
                    >
                      {cohort.retention7d}%
                    </span>
                  </td>
                  <td className="text-center p-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCellColor(cohort.retention14d, "retention")}`}
                    >
                      {cohort.retention14d}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" />
            High conversion
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-200" />
            Medium
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-100" />
            Low
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500" />
            High retention
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
