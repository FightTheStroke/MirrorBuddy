"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  MessageCircle,
  Mic,
  Wrench,
  FileText,
  ChevronDown,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialUsageData {
  chat: { used: number; limit: number; percentage: number };
  voice: { used: number; limit: number; percentage: number };
  tools: { used: number; limit: number; percentage: number };
  docs: { used: number; limit: number; percentage: number };
}

interface TrialHeaderDropdownProps {
  chatsRemaining: number;
  maxChats: number;
}

export function TrialHeaderDropdown({
  chatsRemaining,
  maxChats,
}: TrialHeaderDropdownProps) {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [usageData, setUsageData] = useState<TrialUsageData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLow = chatsRemaining <= 3;
  const chatsUsed = maxChats - chatsRemaining;

  // Fetch full usage data when dropdown opens
  useEffect(() => {
    if (isOpen && !usageData) {
      fetch("/api/user/usage")
        .then((res) => res.json())
        .then(setUsageData)
        .catch(() => null);
    }
  }, [isOpen, usageData]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          isLow
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40"
            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Gift className="w-3.5 h-3.5" />
        <span>{t("trialLabel")}</span>
        <span className="flex items-center gap-1 pl-1.5 border-l border-current/20">
          <MessageCircle className="w-3 h-3" />
          {chatsRemaining}/{maxChats}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div
              className={cn(
                "px-4 py-3",
                isLow
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
                  : "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
              )}
            >
              <h3
                className={cn(
                  "font-semibold text-sm",
                  isLow
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-purple-900 dark:text-purple-100",
                )}
              >
                {isLow ? "Risorse quasi esaurite!" : "Modalità Prova"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t("registratiPerAccessoIllimitato")}
              </p>
            </div>

            {/* Usage Stats */}
            <div className="p-4 space-y-3">
              {/* Chat */}
              <UsageRow
                icon={<MessageCircle className="w-4 h-4" />}
                label="Chat"
                used={chatsUsed}
                limit={maxChats}
                getProgressColor={getProgressColor}
              />

              {/* Voice */}
              <UsageRow
                icon={<Mic className="w-4 h-4" />}
                label="Voce"
                used={
                  usageData ? Math.floor(usageData.voice.used / 60) : undefined
                }
                limit={
                  usageData ? Math.floor(usageData.voice.limit / 60) : undefined
                }
                unit="min"
                getProgressColor={getProgressColor}
              />

              {/* Tools */}
              <UsageRow
                icon={<Wrench className="w-4 h-4" />}
                label="Strumenti"
                used={usageData?.tools.used}
                limit={usageData?.tools.limit}
                getProgressColor={getProgressColor}
              />

              {/* Documents */}
              <UsageRow
                icon={<FileText className="w-4 h-4" />}
                label="Documenti"
                used={usageData?.docs.used}
                limit={usageData?.docs.limit}
                getProgressColor={getProgressColor}
              />
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 space-y-2">
              <Link
                href="/invite/request"
                className={cn(
                  "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors",
                  isLow
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
                )}
                onClick={() => setIsOpen(false)}
              >
                <UserPlus className="w-4 h-4" />
                {t("richiediAccesso")}
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                {t("login")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface UsageRowProps {
  icon: React.ReactNode;
  label: string;
  used?: number;
  limit?: number;
  unit?: string;
  getProgressColor: (percentage: number) => string;
}

function UsageRow({
  icon,
  label,
  used,
  limit,
  unit = "",
  getProgressColor,
}: UsageRowProps) {
  const isLoading = used === undefined || limit === undefined;
  const percentage = isLoading ? 0 : Math.round((used / limit) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-700 dark:text-slate-300">{label}</span>
          {isLoading ? (
            <span className="text-slate-400">...</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              {used}/{limit}
              {unit}
            </span>
          )}
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          {isLoading ? (
            <div className="h-full w-1/3 bg-slate-300 dark:bg-slate-600 animate-pulse rounded-full" />
          ) : (
            <div
              className={cn(
                "h-full rounded-full transition-all",
                getProgressColor(percentage),
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
