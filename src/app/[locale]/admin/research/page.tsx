"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Beaker, Users, Grid, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  const chartData = stats.map(s => ({
    name: s.maestroId.toUpperCase(),
    scaffolding: s._avg.scaffoldingScore * 100,
    hinting: s._avg.hintingQuality * 100,
    engagement: s._avg.engagementRetained * 100
  }));

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500 text-white";
    if (score >= 0.6) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900">
            <FlaskConical className="w-8 h-8 text-purple-600" />
            Pedagogical Intelligence Dashboard
          </h1>
          <p className="text-slate-500 mt-2">Scientific validation of AI Maestri across neurodiverse profiles.</p>
        </div>
        <Badge className="bg-purple-600 px-4 py-1 text-white">Stage 2: Full Integration</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART: PERFORMANCE OVERVIEW */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <CardTitle>Performance by Dimension (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="scaffolding" fill="#8884d8" name="Scaffolding" />
                <Bar dataKey="hinting" fill="#82ca9d" name="Hinting" />
                <Bar dataKey="engagement" fill="#ffc658" name="Engagement" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MATRIX: CROSS-FEEDBACK */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-600" />
            <CardTitle>Synthetic Student Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="border rounded-lg overflow-hidden">
                <TableHeader>
                  <TableRow className="bg-slate-100">
                    <TableHead className="font-bold w-32">Persona</TableHead>
                    {studentProfiles.map(p => (
                      <TableHead key={p} className="text-center">{p}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.maestroId} className="hover:bg-white transition-colors">
                      <TableCell className="font-bold uppercase text-slate-700">{s.maestroId}</TableCell>
                      {studentProfiles.map(p => {
                        const score = s._avg.scaffoldingScore;
                        return (
                          <TableCell key={p} className="text-center p-2">
                            <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-lg font-bold ${getScoreColor(score)}`}>
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
      </div>
    </div>
  );
}
