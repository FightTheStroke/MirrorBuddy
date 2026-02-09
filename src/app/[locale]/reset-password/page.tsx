"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormState = "idle" | "submitting" | "success" | "error";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");

  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>(
    token ? "idle" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : t("resetPassword.invalidToken"),
  );

  const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    {
      label: "At least 8 characters",
      test: (p) => p.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      test: (p) => /[A-Z]/.test(p),
    },
    {
      label: "Contains lowercase letter",
      test: (p) => /[a-z]/.test(p),
    },
    {
      label: "Contains number",
      test: (p) => /[0-9]/.test(p),
    },
  ];

  const passwordsMatch = password === confirmPassword;
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) =>
    req.test(password),
  );
  const canSubmit =
    token &&
    password &&
    confirmPassword &&
    passwordsMatch &&
    allRequirementsMet &&
    formState !== "submitting";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setFormState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState("error");
        setErrorMessage(data.error || t("resetPassword.errorMessage"));
        return;
      }

      setFormState("success");
      // Redirect to login after 2 seconds
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setFormState("error");
      setErrorMessage(t("resetPassword.errorMessage"));
    }
  };

  if (formState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("resetPassword.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {t("resetPassword.successMessage")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("redirectingToLogin")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("resetPassword.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            {t("resetPassword.description")}
          </p>
        </div>

        {formState === "error" && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("resetPassword.passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={formState === "submitting" || !token}
                className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder={t("enterNewPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            <div className="mt-2 space-y-1">
              {PASSWORD_REQUIREMENTS.map((req, idx) => {
                const met = req.test(password);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-xs ${
                      met
                        ? "text-green-600 dark:text-green-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <CheckCircle
                      className={`w-3 h-3 ${met ? "opacity-100" : "opacity-30"}`}
                    />
                    {req.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("resetPassword.confirmLabel")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={formState === "submitting" || !token}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                confirmPassword && !passwordsMatch
                  ? "border-red-500"
                  : "border-slate-300 dark:border-slate-600"
              }`}
              placeholder={t("confirmNewPassword")}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">
                {t("passwordMismatch")}
              </p>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {formState === "submitting"
              ? "Resetting..."
              : t("resetPassword.submitButton")}
          </Button>
        </form>
      </div>
    </div>
  );
}
