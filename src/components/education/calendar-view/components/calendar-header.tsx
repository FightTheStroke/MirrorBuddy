/**
 * @file calendar-header.tsx
 * @brief Calendar header component
 */

import { useTranslations } from "next-intl";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { ViewTab } from "../hooks/use-calendar-view";

interface CalendarHeaderProps {
  onAddClick: () => void;
  activeTab: ViewTab;
}

export function CalendarHeader({ onAddClick, activeTab }: CalendarHeaderProps) {
  const t = useTranslations("education.calendar");

  return (
    <PageHeader
      icon={Calendar}
      title={t("title")}
      rightContent={
        <Button
          onClick={onAddClick}
          className="gap-2"
          disabled={activeTab !== "calendar"}
        >
          <Plus className="w-4 h-4" />
          {t("newEvent")}
        </Button>
      }
    />
  );
}
