"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  School,
  Users,
  Settings,
  Download,
  Plus,
  ShieldCheck,
  MoreVertical,
  Search,
} from "lucide-react";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SchoolPortal() {
  const { settings } = useAccessibilityStore();

  const classes = [
    {
      name: "3A - Scientifico",
      students: 24,
      status: "active",
      teacher: "Prof. Rossi",
    },
    {
      name: "5B - Linguistico",
      students: 18,
      status: "active",
      teacher: "Prof.ssa Bianchi",
    },
    {
      name: "2C - Tecnico",
      students: 22,
      status: "setup",
      teacher: "Prof. Verdi",
    },
    {
      name: "1A - Classico",
      students: 20,
      status: "active",
      teacher: "Prof. Neri",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1
              className={cn(
                "text-3xl font-bold",
                settings.highContrast
                  ? "text-yellow-400"
                  : "text-slate-900 dark:text-white",
              )}
            >
              School Portal
            </h1>
            <p className="text-muted-foreground">
              Liceo Scientifico &ldquo;G. Galilei&rdquo; • Administrative
              Management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Class
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className={cn(
            "col-span-1 md:col-span-2",
            settings.highContrast ? "border-yellow-400 bg-gray-900" : "",
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Classes</CardTitle>
                <CardDescription>
                  Manage student groups and teacher access
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search classes..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {classes.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors",
                    settings.highContrast
                      ? "border-yellow-400/30 hover:bg-yellow-400/5"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900",
                  )}
                  role="listitem"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {c.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.teacher}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {c.students} Students
                      </p>
                      <Badge
                        variant={
                          c.status === "active" ? "default" : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card
            className={
              settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
            }
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Data Protection (GDPR)</span>
                  <span className="text-emerald-500 font-bold">100%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Parental Consent</span>
                  <span className="text-amber-500 font-bold">85%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[85%]" />
                </div>
              </div>
              <Button variant="link" className="px-0 h-auto text-xs">
                View detailed compliance report
              </Button>
            </CardContent>
          </Card>

          <Card
            className={
              settings.highContrast ? "border-yellow-400 bg-gray-900" : ""
            }
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                School Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-12"
              >
                <Users className="w-4 h-4" />
                Manage Faculty
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-12"
              >
                <ShieldCheck className="w-4 h-4" />
                Security Policies
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
