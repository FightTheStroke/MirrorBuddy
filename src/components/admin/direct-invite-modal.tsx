"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Mail, User, Loader2, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface DirectInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface InviteResult {
  userId: string;
  username: string;
  email: string;
}

export function DirectInviteModal({
  isOpen,
  onClose,
  onSuccess,
}: DirectInviteModalProps) {
  const t = useTranslations("admin.components.directInviteModal");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  // Add/remove Escape listener and focus first input
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus first input or close button after render
      setTimeout(() => {
        if (result) {
          closeButtonRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 0);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown, result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch("/api/invites/direct", {
        method: "POST",
        body: JSON.stringify({ email, name: name || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invite");
      }

      setResult(data);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUsername = async () => {
    if (result?.username) {
      await navigator.clipboard.writeText(result.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail("");
    setName("");
    setError(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct-invite-title"
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="direct-invite-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {result ? t("titleSuccess") : t("titleCreate")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {result ? (
          // Success state
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {t("successMessage")}
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {t("generatedUsername")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono text-slate-900 dark:text-white">
                  {result.username}
                </code>
                <button
                  onClick={handleCopyUsername}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  title={t("copyUsername")}
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {result.email}
              </p>
            </div>

            <Button
              ref={closeButtonRef}
              onClick={handleClose}
              className="w-full"
            >
              {t("close")}
            </Button>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="direct-email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={emailInputRef}
                    id="direct-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("emailPlaceholder")}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="direct-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  {t("nameLabel")}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="direct-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 mb-6">
              {t("emailHelpText")}
            </p>

            <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 min-h-11 min-w-11"
                disabled={loading}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-11 min-w-11"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  t("createUser")
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default DirectInviteModal;
