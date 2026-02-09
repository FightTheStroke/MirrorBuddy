"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { csrfFetch } from "@/lib/auth";

interface FormData {
  schoolName: string;
  contactName: string;
  email: string;
  vatNumber: string;
  tier: string;
  studentCount: string;
}

export function SchoolRegistrationForm() {
  const t = useTranslations("common");
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    schoolName: "",
    contactName: "",
    email: "",
    vatNumber: "",
    tier: "base",
    studentCount: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await csrfFetch("/api/schools/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/welcome"), 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
        <h2 className="text-2xl font-bold text-green-800 dark:text-green-300">
          {t("registrationReceived")}
        </h2>
        <p className="mt-2 text-green-700 dark:text-green-400">
          {t("weWillContactYouWithin24HoursToSetUpYourSchoolPilo")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="schoolName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("schoolName")}
          </label>
          <input
            id="schoolName"
            name="schoolName"
            type="text"
            required
            value={form.schoolName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="contactName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("contactPerson")}
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            value={form.contactName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="vatNumber"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("vatTaxId")}
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            type="text"
            value={form.vatNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="tier"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("preferredPlan")}
          </label>
          <select
            id="tier"
            name="tier"
            value={form.tier}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="base">{t("baseFree")}</option>
            <option value="pro">{t("pro")}</option>
            <option value="school">{t("schoolCustom")}</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="studentCount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("estimatedStudents")}
          </label>
          <input
            id="studentCount"
            name="studentCount"
            type="number"
            min="1"
            value={form.studentCount}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("somethingWentWrongPleaseTryAgain")}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
      >
        {status === "loading" ? t("loading") : "Register School"}
      </button>
    </form>
  );
}
