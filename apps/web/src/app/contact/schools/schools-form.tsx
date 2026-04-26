"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle,
  Send,
  BookOpen,
  Users,
  BarChart3,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth";
import {
  type FormData,
  ROLES,
  SCHOOL_TYPES,
  STUDENT_COUNTS,
} from "./schools-form-constants";

type FormState = "idle" | "submitting" | "success" | "error";

export function SchoolsContactForm() {
  const t = useTranslations("compliance.contact.schools_form");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    schoolName: "",
    schoolType: "",
    studentCount: "",
    specificNeeds: "",
    message: "",
  });

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.role &&
    formData.schoolName &&
    formData.schoolType &&
    formData.studentCount &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formState !== "submitting";

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setFormState("submitting");
    setErrorMessage("");

    try {
      const response = await csrfFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          type: "schools",
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role.trim(),
          schoolName: formData.schoolName.trim(),
          schoolType: formData.schoolType.trim(),
          studentCount: formData.studentCount.trim(),
          specificNeeds: formData.specificNeeds.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState("error");
        setErrorMessage(data.message || t("errorDefault"));
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMessage(t("errorConnection"));
    }
  };

  if (formState === "success") {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-lg text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t("successTitle")}
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            {t("successMessage")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("solutions")}
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{t("features.curriculum")}</span>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{t("features.management")}</span>
          </div>
          <div className="flex items-start gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{t("features.reporting")}</span>
          </div>
          <div className="flex items-start gap-2">
            <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{t("features.support")}</span>
          </div>
        </div>
      </div>

      {formState === "error" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t("nome1")}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("nome")}
          />
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t("email1")}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("email")}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("roleLabel")}
          >
            <option value="">{t("roleLabel")}</option>
            {ROLES.map((role) => {
              const label = role.label.includes("contact.schools_form")
                ? t(
                    role.label.replace(
                      "contact.schools_form.options.",
                      "options.",
                    ),
                  )
                : role.label;
              return (
                <option key={role.value} value={role.value}>
                  {label}
                </option>
              );
            })}
          </select>
          <select
            id="schoolType"
            name="schoolType"
            value={formData.schoolType}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("schoolTypeLabel")}
          >
            <option value="">{t("schoolTypeLabel")}</option>
            {SCHOOL_TYPES.map((type) => {
              const label = type.label.includes("contact.schools_form")
                ? t(
                    type.label.replace(
                      "contact.schools_form.options.",
                      "options.",
                    ),
                  )
                : type.label;
              return (
                <option key={type.value} value={type.value}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            id="schoolName"
            type="text"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleInputChange}
            placeholder={t("schoolNameLabel")}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("schoolNameLabel")}
          />
          <select
            id="studentCount"
            name="studentCount"
            value={formData.studentCount}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={t("studentCountLabel")}
          >
            <option value="">{t("studentCountLabel")}</option>
            {STUDENT_COUNTS.map((count) => {
              const label = count.label.includes("contact.schools_form")
                ? t(
                    count.label.replace(
                      "contact.schools_form.options.",
                      "options.",
                    ),
                  )
                : count.label;
              return (
                <option key={count.value} value={count.value}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <textarea
          id="specificNeeds"
          name="specificNeeds"
          value={formData.specificNeeds}
          onChange={handleInputChange}
          placeholder={t("specificNeedsLabel")}
          rows={3}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          aria-label={t("specificNeedsLabel")}
        />

        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          placeholder={t("messagePlaceholder")}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          aria-label={t("messagePlaceholder")}
        />
      </div>

      <Button
        type="submit"
        disabled={!isFormValid}
        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {formState === "submitting"
          ? t("submitButtonLoading")
          : t("submitButtonDefault")}
      </Button>
    </form>
  );
}
