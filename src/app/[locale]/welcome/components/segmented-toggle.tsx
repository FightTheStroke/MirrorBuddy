"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { useTranslations } from "next-intl";

interface SegmentedToggleProps {
  value: "individuals" | "organizations";
  onChange: (value: "individuals" | "organizations") => void;
}

export function SegmentedToggle({ value, onChange }: SegmentedToggleProps) {
  const t = useTranslations("welcome.tierComparison.toggle");
  const containerRef = useRef<HTMLDivElement>(null);

  const options = [
    { id: "individuals", label: t("individuals") },
    { id: "organizations", label: t("organizations") },
  ] as const;

  const handleKeyDown = (e: React.KeyboardEvent, optionId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (optionId !== value) {
        onChange(optionId as "individuals" | "organizations");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="inline-flex gap-0 p-1 bg-gray-100 dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700"
      role="tablist"
      aria-label={t("ariaLabel")}
    >
      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <div key={option.id} className="relative">
            {isActive && (
              <motion.div
                layoutId="toggle-background"
                className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}

            <button
              type="button"
              onClick={() =>
                onChange(option.id as "individuals" | "organizations")
              }
              onKeyDown={(e) => handleKeyDown(e, option.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={`Switch to ${option.label}`}
              className={`relative px-6 py-2 font-semibold text-sm transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                isActive
                  ? "text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {option.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
