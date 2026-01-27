/**
 * @file upcoming-events.tsx
 * @brief Upcoming events sidebar component
 */

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, PRIORITY_COLORS, type EventType } from "../constants";
import type { SchoolEvent } from "@/lib/stores";

interface UpcomingEventsProps {
  events: SchoolEvent[];
  onToggleCompleted: (id: string) => void;
  onEdit: (event: SchoolEvent) => void;
  onDelete: (id: string) => void;
}

export function UpcomingEvents({
  events,
  onToggleCompleted,
  onEdit,
  onDelete,
}: UpcomingEventsProps) {
  const t = useTranslations("education.calendar");

  const getEventTypeConfig = (type: EventType) => {
    return EVENT_TYPES.find((t) => t.id === type) || EVENT_TYPES[0];
  };

  const upcomingEvents = events
    .filter((e) => !e.completed && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("upcomingEvents")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.map((event) => {
          const typeConfig = getEventTypeConfig(event.type);
          const Icon = typeConfig.icon;
          const daysUntil = Math.ceil(
            (new Date(event.date).getTime() - new Date().getTime()) /
              (24 * 60 * 60 * 1000),
          );

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-3 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-800/50",
                PRIORITY_COLORS[event.priority],
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className={cn("p-1.5 rounded", typeConfig.color)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.subject} •{" "}
                      {daysUntil === 0
                        ? t("today")
                        : daysUntil === 1
                          ? t("tomorrow")
                          : t("daysUntil", { daysUntil })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onToggleCompleted(event.id)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {upcomingEvents.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t("emptyState")}</p>
            <p className="text-xs mt-1">{t("emptyStateSubtitle")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
