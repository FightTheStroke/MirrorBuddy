"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { csrfFetch } from "@/lib/auth";
import { useTranslations } from "next-intl";

interface SchoolStats {
  totalStudents: number;
  activeStudents: number;
  totalSessions: number;
  ssoEnabled: boolean;
  tier: string;
  subscriptionStatus: string;
}

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  data: {
    schoolName: string;
    tier: string;
    studentCount: number | null;
  };
  status: string;
  createdAt: string;
}

export default function SchoolAdminDashboard() {
  const t = useTranslations("admin");
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        csrfFetch("/api/admin/school/stats"),
        csrfFetch("/api/admin/school/requests"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        {t("loadingSchoolDashboard")}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">{t("schoolAdministration")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={stats?.totalStudents ?? 0} />
        <StatCard label="Active Students" value={stats?.activeStudents ?? 0} />
        <StatCard label="Sessions" value={stats?.totalSessions ?? 0} />
        <StatCard
          label="SSO"
          value={stats?.ssoEnabled ? "Enabled" : "Not configured"}
          isText
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 text-lg font-semibold">{t("subscription")}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("plan1")} <span className="font-medium">{stats?.tier ?? "N/A"}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("status1")}{" "}
            <span className="font-medium">
              {stats?.subscriptionStatus ?? "N/A"}
            </span>
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 text-lg font-semibold">{t("quickActions")}</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/invites"
              className="rounded bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
            >
              {t("bulkInvite")}
            </Link>
            <Link
              href="/admin/tiers"
              className="rounded bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {t("manageTiers")}
            </Link>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {t("schoolRegistrationRequests")}
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium">{t("school")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("contact")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("plan")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("status")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    {t("noSchoolRequestsYet")}
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-2 font-medium">
                      {req.data.schoolName}
                    </td>
                    <td className="px-4 py-2">{req.name}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {req.data.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          req.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : req.status === "converted"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  isText?: boolean;
}

function StatCard({ label, value, isText }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-1 font-bold ${isText ? "text-lg" : "text-2xl"} text-gray-900 dark:text-white`}
      >
        {value}
      </p>
    </div>
  );
}
