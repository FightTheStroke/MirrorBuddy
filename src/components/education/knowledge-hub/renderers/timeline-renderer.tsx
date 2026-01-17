"use client";

/**
 * Knowledge Hub Timeline Renderer
 *
 * Displays historical or sequential events on a visual timeline.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   events: TimelineEvent[];
 * }
 */

import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseRendererProps } from "./types";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  icon?: string;
}

interface TimelineData {
  title?: string;
  events: TimelineEvent[];
}

/**
 * Render a timeline for Knowledge Hub.
 */
export function TimelineRenderer({ data, className }: BaseRendererProps) {
  const timelineData = data as unknown as TimelineData;

  const title = timelineData.title || "Linea del Tempo";
  const events = timelineData.events || [];

  if (events.length === 0) {
    return (
      <div className={cn("p-4 text-center text-slate-500", className)}>
        Nessun evento disponibile
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent-themed" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-10"
            >
              {/* Timeline dot */}
              <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-accent-themed border-2 border-white dark:border-slate-900" />

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  {event.date}
                </div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  {event.title}
                </h4>
                {event.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {event.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
