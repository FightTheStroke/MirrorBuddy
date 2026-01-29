"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Search, Users, Brain, BookOpen, Microscope } from "lucide-react";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { cn } from "@/lib/utils";

const mockData = {
  activeStudents: [
    { month: "Jan", count: 400 },
    { month: "Feb", count: 600 },
    { month: "Mar", count: 800 },
    { month: "Apr", count: 1200 },
  ],
  methodEfficiency: [
    { subject: "Math", scaffolding: 85, autonomy: 65 },
    { subject: "History", scaffolding: 90, autonomy: 80 },
    { subject: "Science", scaffolding: 75, autonomy: 70 },
    { subject: "Language", scaffolding: 95, autonomy: 85 },
  ],
};

export function ResearchDashboard() {
  const { settings } = useAccessibilityStore();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-3xl font-bold",
              settings.highContrast
                ? "text-yellow-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            Research Analytics
          </h1>
          <p className="text-muted-foreground">
            Aggregate study on learning patterns and method efficiency.
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-full">
          <Microscope className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Participants", value: "2,543", icon: Users },
          { label: "Lessons Analyzed", value: "15.2k", icon: BookOpen },
          { label: "Avg. Autonomy Gain", value: "+24%", icon: Brain },
          { label: "Subjects Covered", value: "18", icon: Search },
        ].map((stat, i) => (
          <Card
            key={i}
            className={
              settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
            }
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className={
            settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
          }
        >
          <CardHeader>
            <CardTitle>Growth in Participation</CardTitle>
            <CardDescription>
              Monthly active researchers and students
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData.activeStudents}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={settings.highContrast ? "#444" : "#eee"}
                />
                <XAxis
                  dataKey="month"
                  stroke={settings.highContrast ? "#fff" : "#888"}
                />
                <YAxis stroke={settings.highContrast ? "#fff" : "#888"} />
                <Tooltip
                  contentStyle={
                    settings.highContrast
                      ? { backgroundColor: "#000", border: "1px solid yellow" }
                      : {}
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={settings.highContrast ? "#eab308" : "#2563eb"}
                  strokeWidth={3}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className={
            settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
          }
        >
          <CardHeader>
            <CardTitle>Method Efficiency by Subject</CardTitle>
            <CardDescription>Scaffolding vs Autonomy scores</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData.methodEfficiency}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={settings.highContrast ? "#444" : "#eee"}
                />
                <XAxis
                  dataKey="subject"
                  stroke={settings.highContrast ? "#fff" : "#888"}
                />
                <YAxis stroke={settings.highContrast ? "#fff" : "#888"} />
                <Tooltip
                  contentStyle={
                    settings.highContrast
                      ? { backgroundColor: "#000", border: "1px solid yellow" }
                      : {}
                  }
                />
                <Legend />
                <Bar
                  dataKey="scaffolding"
                  fill={settings.highContrast ? "#eab308" : "#3b82f6"}
                  radius={[4, 4, 0, 0]}
                  name="Scaffolding (%)"
                />
                <Bar
                  dataKey="autonomy"
                  fill={settings.highContrast ? "#fff" : "#10b981"}
                  radius={[4, 4, 0, 0]}
                  name="Autonomy (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card
        className={settings.highContrast ? "border-yellow-400 bg-gray-900" : ""}
      >
        <CardHeader>
          <CardTitle>Learning Heatmap (Scaffolding vs Autonomy)</CardTitle>
          <CardDescription>
            Interactive matrix of student performance across topics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="grid grid-cols-5 gap-2"
            role="grid"
            aria-label="Student performance heatmap"
          >
            {/* Header */}
            <div className="p-2 text-xs font-bold text-muted-foreground">
              Topic
            </div>
            <div className="p-2 text-xs font-bold text-muted-foreground text-center">
              Alex
            </div>
            <div className="p-2 text-xs font-bold text-muted-foreground text-center">
              Maria
            </div>
            <div className="p-2 text-xs font-bold text-muted-foreground text-center">
              Luca
            </div>
            <div className="p-2 text-xs font-bold text-muted-foreground text-center">
              Sofia
            </div>

            {/* Row 1 */}
            <div className="p-2 text-sm font-medium">Euclide</div>
            <div
              className="bg-emerald-500/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Euclide with Alex: 85% Scaffolding"
            >
              85%
            </div>
            <div
              className="bg-emerald-400/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Euclide with Maria: 72% Scaffolding"
            >
              72%
            </div>
            <div
              className="bg-amber-400/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Euclide with Luca: 45% Scaffolding"
            >
              45%
            </div>
            <div
              className="bg-emerald-500/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Euclide with Sofia: 92% Scaffolding"
            >
              92%
            </div>

            {/* Row 2 */}
            <div className="p-2 text-sm font-medium">Newton</div>
            <div
              className="bg-emerald-300/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Newton with Alex: 65% Scaffolding"
            >
              65%
            </div>
            <div
              className="bg-emerald-500/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Newton with Maria: 88% Scaffolding"
            >
              88%
            </div>
            <div
              className="bg-red-400/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Newton with Luca: 12% Scaffolding"
            >
              12%
            </div>
            <div
              className="bg-amber-400/80 p-4 rounded text-white text-center text-xs font-bold"
              role="gridcell"
              aria-label="Newton with Sofia: 54% Scaffolding"
            >
              54%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
