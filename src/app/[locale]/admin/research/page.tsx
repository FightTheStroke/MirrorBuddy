"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Beaker, Users, CheckCircle2 } from "lucide-react";

export default function ResearchDashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/research/stats");
        const data = await res.json();
        setStats(data.stats || []);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-purple-600" />
            Science Lab: Pedagogical Quality Scorecard
          </h1>
          <p className="text-slate-500 mt-2">
            Automated validation insights from Synthetic Student simulations.
          </p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="px-4 py-1 text-sm bg-purple-50 border-purple-200">
            <Beaker className="w-4 h-4 mr-2" />
            Stage 2 Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Simulations</CardTitle>
            <Users className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reduce((acc, s) => acc + s._count, 0)}</div>
            <p className="text-xs text-slate-500">+12% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Scaffolding Score</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.reduce((acc, s) => acc + s._avg.scaffoldingScore, 0) / (stats.length || 1)).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500">Benchmark: 0.70 (TutorBench)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maestro Pedagogical Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Maestro</TableHead>
                <TableHead>Simulations</TableHead>
                <TableHead>Scaffolding</TableHead>
                <TableHead>Hinting</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.maestroId}>
                  <TableCell className="font-bold uppercase">{s.maestroId}</TableCell>
                  <TableCell>{s._count}</TableCell>
                  <TableCell>{(s._avg.scaffoldingScore * 100).toFixed(0)}%</TableCell>
                  <TableCell>{(s._avg.hintingQuality * 100).toFixed(0)}%</TableCell>
                  <TableCell>{(s._avg.engagementRetained * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge className={s._avg.scaffoldingScore > 0.75 ? "bg-green-500" : "bg-amber-500"}>
                      {s._avg.scaffoldingScore > 0.75 ? "Pedagogically Safe" : "Refinement Needed"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {stats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No simulation data available yet. Run pedagogical tests to see results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
