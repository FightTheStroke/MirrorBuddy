"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Wrench, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalculatorHeaderWidget } from "@/components/calculator";
import { AmbientAudioHeaderWidget } from "@/components/ambient-audio";
import { PomodoroHeaderWidget } from "@/components/pomodoro";
import { cn } from "@/lib/utils";

export function ToolsDropdown() {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 gap-1.5 rounded-full transition-colors",
          isOpen
            ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
            : "text-slate-500 hover:text-blue-500 hover:bg-blue-500/10",
        )}
        title={t("tools")}
        aria-label={t("tools")}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Wrench className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">
          {t("tools")}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-50"
        >
          {/* Widgets container */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CalculatorHeaderWidget />
              <AmbientAudioHeaderWidget />
              <PomodoroHeaderWidget />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
