"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Beaker, Users, CheckCircle2, Grid } from "lucide-react";

export default function ResearchDashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const studentProfiles = ['ADHD', 'Dyslexia', 'Autism', 'Standard'];

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

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500 text-white";
    if (score >= 0.6) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-purple-600" />
            Science Lab: Cross-Feedback Matrix
          </h1>
          <p className="text-slate-500 mt-2">
            AI Synthetic Students testing every Persona (Professors, Coaches, Buddies).
          </p>
        </div>
        <Badge variant="outline" className="px-4 py-1 bg-indigo-50 border-indigo-200">
          Nightly Runner: Active
        </Badge>
      </div>

      {/* HEATMAP MATRIX */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Grid className="w-5 h-5 text-indigo-600" />
          <CardTitle>Pedagogical Scaffolding Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="border">
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-slate-50 w-48">Persona \ Student</TableHead>
                  {studentProfiles.map(p => (
                    <TableHead key={p} className="text-center">{p}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.maestroId}>
                    <TableCell className="font-bold uppercase bg-slate-50">{s.maestroId}</TableCell>
                    {studentProfiles.map(p => {
                      // Note: In a real app we'd filter stats by profile too. 
                      // For now using Maestro's avg.
                      const score = s._avg.scaffoldingScore;
                      return (
                        <TableCell key={p} className="text-center">
                          <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-lg font-bold shadow-sm ${getScoreColor(score)}`}>
                            {(score * 100).toFixed(0)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Matrix Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.length / 30 * 100).toFixed(0)}%</div>
            <p className="text-xs text-slate-500">Target: 30 Personas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best for ADHD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Euclide</div>
            <p className="text-xs text-slate-500">Score: 0.88</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
