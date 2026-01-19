"use client";

import Link from "next/link";
import {
  UserPlus,
  Users,
  BarChart3,
  FileText,
  Shield,
  ArrowRight,
} from "lucide-react";

interface AdminCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const ADMIN_SECTIONS: AdminCard[] = [
  {
    title: "Richieste Beta",
    description: "Gestisci le richieste di invito alla beta privata",
    href: "/admin/invites",
    icon: <UserPlus className="w-6 h-6" />,
    color: "bg-purple-500",
  },
  {
    title: "Utenti",
    description: "Visualizza e gestisci gli utenti registrati",
    href: "/admin/users",
    icon: <Users className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    title: "Analytics",
    description: "Metriche di utilizzo e performance",
    href: "/admin/analytics",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "bg-emerald-500",
  },
  {
    title: "Termini di Servizio",
    description: "Gestisci le versioni dei ToS",
    href: "/admin/tos",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-amber-500",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-slate-900 dark:bg-white rounded-lg">
            <Shield className="w-6 h-6 text-white dark:text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Gestione MirrorBuddy
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group block bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${section.color} p-3 rounded-lg text-white shrink-0`}
                >
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-500">
          <p>MirrorBuddy Admin Panel</p>
        </div>
      </div>
    </div>
  );
}
