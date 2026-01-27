/**
 * Knowledge Hub Constants
 */

import { FolderTree, LayoutGrid, Calendar, Clock } from "lucide-react";
import type { ViewOption } from "./knowledge-hub/types";

// View icons only - labels and descriptions come from translations
export const VIEW_ICONS = {
  explorer: <FolderTree className="w-4 h-4" />,
  gallery: <LayoutGrid className="w-4 h-4" />,
  timeline: <Clock className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
} as const;

export const VIEW_IDS = [
  "explorer",
  "gallery",
  "timeline",
  "calendar",
] as const;

export function getViewOptions(t: (key: string) => string): ViewOption[] {
  return [
    {
      id: "explorer",
      label: t("views.explorer.label"),
      icon: VIEW_ICONS.explorer,
      description: t("views.explorer.description"),
    },
    {
      id: "gallery",
      label: t("views.gallery.label"),
      icon: VIEW_ICONS.gallery,
      description: t("views.gallery.description"),
    },
    {
      id: "timeline",
      label: t("views.timeline.label"),
      icon: VIEW_ICONS.timeline,
      description: t("views.timeline.description"),
    },
    {
      id: "calendar",
      label: t("views.calendar.label"),
      icon: VIEW_ICONS.calendar,
      description: t("views.calendar.description"),
    },
  ];
}
