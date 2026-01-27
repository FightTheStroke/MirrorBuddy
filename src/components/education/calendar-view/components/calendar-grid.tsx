/**
 * @file calendar-grid.tsx
 * @brief Calendar grid component
 */

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isSameDay } from "../utils/calendar-utils";
import { EVENT_TYPES, type EventType } from "../constants";
import type { CalendarDay } from "../utils/calendar-utils";
import type { SchoolEvent } from "@/lib/stores";

interface CalendarGridProps {
  currentMonth: Date;
  calendarDays: CalendarDay[];
  onMonthChange: (month: Date) => void;
  onEventClick: (event: SchoolEvent) => void;
}

export function CalendarGrid({
  currentMonth,
  calendarDays,
  onMonthChange,
  onEventClick,
}: CalendarGridProps) {
  const t = useTranslations("education.calendarGrid");
  const getEventTypeConfig = (type: EventType) => {
    return EVENT_TYPES.find((t) => t.id === type) || EVENT_TYPES[0];
  };

  // Get day names for current locale
  const dayNames = [
    t("dayNames.monday"),
    t("dayNames.tuesday"),
    t("dayNames.wednesday"),
    t("dayNames.thursday"),
    t("dayNames.friday"),
    t("dayNames.saturday"),
    t("dayNames.sunday"),
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="capitalize">
            {currentMonth.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                onMonthChange(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                  ),
                )
              }
              aria-label={t("ariaLabelPreviousMonth")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMonthChange(new Date())}
            >
              {t("todayButton")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                onMonthChange(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                  ),
                )
              }
              aria-label={t("ariaLabelNextMonth")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isToday = isSameDay(day.date, new Date());

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[80px] p-1 rounded-lg border transition-colors",
                  day.isCurrentMonth
                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    : "bg-slate-50 dark:bg-slate-900/50 border-transparent",
                  isToday && "ring-2 ring-primary",
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-1",
                    isToday
                      ? "text-primary"
                      : day.isCurrentMonth
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400",
                  )}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.events.slice(0, 2).map((event) => {
                    const typeConfig = getEventTypeConfig(event.type);
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer transition-opacity",
                          typeConfig.color,
                          event.completed && "opacity-50 line-through",
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {day.events.length > 2 && (
                    <div className="text-[10px] text-slate-500">
                      {t("moreEvents", { count: day.events.length - 2 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
