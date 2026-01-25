"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { getAllSubjects, subjectNames, subjectColors } from "@/data";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";

interface FilterSheetProps {
  isOpen: boolean;
  selectedSubject: Subject | "all";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubjectChange: (subject: Subject | "all") => void;
  onClose: () => void;
}

export function FilterSheet({
  isOpen,
  selectedSubject,
  searchQuery,
  onSearchChange,
  onSubjectChange,
  onClose,
}: FilterSheetProps) {
  const subjects = getAllSubjects();
  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  // Sync local search state with prop
  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery, isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    onSearchChange(value);
  };

  const handleSubjectClick = (subject: Subject | "all") => {
    onSubjectChange(subject);
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={onClose}
        />

        {/* Bottom sheet content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-white dark:bg-slate-950 rounded-t-2xl border-t border-slate-200 dark:border-slate-800",
            "shadow-lg overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-out-to-bottom-0",
            "duration-200 ease-out",
            "max-h-[90vh] overflow-y-auto",
          )}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Filtri
            </h2>
            <DialogPrimitive.Close
              className={cn(
                "inline-flex items-center justify-center",
                "h-11 w-11",
                "rounded-lg transition-colors",
                "text-slate-600 dark:text-slate-400",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
                "dark:focus:ring-offset-slate-950",
              )}
              aria-label="Chiudi filtri"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="px-4 py-4 space-y-4 pb-8">
            {/* Search input */}
            <div className="space-y-2">
              <label
                htmlFor="filter-search"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Cerca
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="filter-search"
                  type="text"
                  placeholder="Cerca..."
                  value={localSearch}
                  onChange={handleSearchChange}
                  className={cn(
                    "w-full pl-8 pr-3 py-3 rounded-lg",
                    "min-h-[44px]",
                    "bg-slate-50 dark:bg-slate-900",
                    "border border-slate-200 dark:border-slate-700",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
                    "dark:focus:ring-offset-slate-950",
                    "text-sm",
                  )}
                  aria-label="Cerca professore o materia"
                />
              </div>
            </div>

            {/* Subject filters */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Materia
              </label>
              <div className="space-y-2">
                {/* Tutti button */}
                <button
                  onClick={() => handleSubjectClick("all")}
                  className={cn(
                    "w-full px-3 py-3 rounded-lg text-sm font-medium",
                    "transition-all min-h-[44px]",
                    "flex items-center justify-center",
                    selectedSubject === "all"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                  )}
                  aria-pressed={selectedSubject === "all"}
                >
                  Tutti
                </button>

                {/* Subject buttons - grid for better touch target spacing */}
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map((subject) => {
                    const isSelected = selectedSubject === subject;
                    return (
                      <button
                        key={subject}
                        onClick={() => handleSubjectClick(subject)}
                        className={cn(
                          "px-3 py-3 rounded-lg text-sm font-medium",
                          "transition-all min-h-[44px]",
                          "flex items-center justify-center",
                          "text-center",
                          isSelected
                            ? "text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                        )}
                        style={
                          isSelected
                            ? { backgroundColor: subjectColors[subject] }
                            : undefined
                        }
                        aria-pressed={isSelected}
                      >
                        {subjectNames[subject]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
