"use client";

/**
 * 🏢 School Admin Portal
 * Management interface for schools, classrooms, and institutional licenses.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School, Users, Key, GraduationCap, Plus } from "lucide-react";

export default function SchoolAdminPortal() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <School className="w-8 h-8 text-blue-600" />
            Institutional Administration
          </h1>
          <p className="text-slate-500 mt-2">Manage your school's classes, students, and MirrorBuddy licenses.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Classroom
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Students</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124 / 200</div>
            <p className="text-xs text-slate-500">License Capacity: 62%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Classrooms</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-slate-500">2 pending teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">License Status</CardTitle></CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">PREMIUM INSTITUTIONAL</Badge>
            <p className="text-xs text-slate-500 mt-2">Renews in 45 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Classroom Management</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classroom Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Research Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">3A - Scientific</TableCell>
                <TableCell>High School</TableCell>
                <TableCell>24</TableCell>
                <TableCell><Badge variant="outline" className="text-purple-600">Enabled</Badge></TableCell>
                <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">2B - Classics</TableCell>
                <TableCell>High School</TableCell>
                <TableCell>18</TableCell>
                <TableCell><Badge variant="outline">Disabled</Badge></TableCell>
                <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
