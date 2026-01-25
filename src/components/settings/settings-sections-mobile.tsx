"use client";

import { useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

export interface SettingsSection {
  id: string;
  title: string;
  icon?: string;
  content: ReactNode;
}

interface SettingsSectionsMobileProps {
  sections: SettingsSection[];
}

/**
 * Mobile-optimized collapsible settings sections component
 * Provides accordion behavior on mobile (xs breakpoint) and expanded by default on desktop
 * F-35: Settings sections are collapsible accordions on mobile
 */
export function SettingsSectionsMobile({
  sections,
}: SettingsSectionsMobileProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)"); // xs breakpoint

  // On desktop, track all expanded sections. On mobile, only track one
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id)), // All expanded by default on desktop
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      if (isMobile) {
        // Mobile: accordion behavior - only one open at a time
        setExpandedId(expandedId === sectionId ? null : sectionId);
      } else {
        // Desktop: allow multiple sections open
        setExpandedSections((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(sectionId)) {
            newSet.delete(sectionId);
          } else {
            newSet.add(sectionId);
          }
          return newSet;
        });
      }
    },
    [isMobile, expandedId],
  );

  const isExpanded = (sectionId: string) => {
    return isMobile
      ? expandedId === sectionId
      : expandedSections.has(sectionId);
  };

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.id}
          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        >
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            aria-expanded={isExpanded(section.id)}
            aria-controls={`${section.id}-content`}
            data-testid={`${section.id}-header`}
            className={cn(
              "w-full flex items-center justify-between gap-3",
              "px-4 py-3 xs:p-4 min-h-[44px]", // 44px touch target
              "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900",
              "transition-colors duration-150",
              "text-left font-medium text-slate-900 dark:text-slate-100",
              isExpanded(section.id) && "bg-slate-100 dark:bg-slate-800",
            )}
          >
            <span className="flex-1 text-sm xs:text-base">{section.title}</span>

            {/* Chevron Icon */}
            <ChevronDown
              data-testid={`${section.id}-chevron`}
              className={cn(
                "w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0",
                "transition-transform duration-300",
                isExpanded(section.id) && "rotate-180",
              )}
            />
          </button>

          {/* Section Content with Smooth Animation */}
          <AnimatePresence initial={false}>
            {isExpanded(section.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  height: { duration: 0.3, ease: "easeInOut" },
                  opacity: { duration: 0.2 },
                }}
                data-testid={`${section.id}-content`}
                id={`${section.id}-content`}
                className="overflow-hidden"
                style={{
                  overflow: "hidden",
                  transition:
                    "height 0.3s ease-in-out, opacity 0.2s ease-in-out",
                }}
              >
                <div className="px-4 py-3 xs:p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700">
                  {section.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
