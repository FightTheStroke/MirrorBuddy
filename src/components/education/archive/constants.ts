/**
 * Constants for Archive View
 * Issue #37: Unified Archive page
 */

import {
  Brain,
  HelpCircle,
  Layers,
  Play,
  Search,
  Calendar,
  Camera,
  FileText,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import type { ToolType } from "@/types/tools";

// ============================================================================
// Types
// ============================================================================

export type FilterType = "all" | "bookmarked" | ToolType;
export type SortBy = "date" | "type" | "rating" | "views";
export type ViewMode = "grid" | "list";

// ============================================================================
// Italian subject labels
// ============================================================================

export const SUBJECT_LABELS: Record<string, string> = {
  matematica: "Matematica",
  italiano: "Italiano",
  storia: "Storia",
  geografia: "Geografia",
  scienze: "Scienze",
  fisica: "Fisica",
  chimica: "Chimica",
  arte: "Arte",
  musica: "Musica",
  filosofia: "Filosofia",
  latino: "Latino",
  greco: "Greco",
  inglese: "Inglese",
  francese: "Francese",
  spagnolo: "Spagnolo",
  tedesco: "Tedesco",
  educazione_fisica: "Educazione Fisica",
  informatica: "Informatica",
  economia: "Economia",
  diritto: "Diritto",
};

// ============================================================================
// Sort options
// ============================================================================

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date", label: "Data" },
  { value: "type", label: "Tipo" },
  { value: "rating", label: "Valutazione" },
  { value: "views", label: "Visualizzazioni" },
];

// ============================================================================
// Tool icons mapping
// ============================================================================

export const TOOL_ICONS: Record<ToolType, typeof Brain> = {
  mindmap: Brain,
  quiz: HelpCircle,
  flashcard: Layers,
  demo: Play,
  search: Search,
  diagram: FileText,
  timeline: Calendar,
  summary: FileText,
  formula: FileText,
  calculator: FileText,
  chart: FileText,
  webcam: Camera,
  "webcam-standalone": Camera,
  pdf: FileText,
  homework: FileText,
  typing: FileText,
  "study-kit": BookmarkCheck,
};

// ============================================================================
// Tool labels (Italian)
// ============================================================================

export const TOOL_LABELS: Record<ToolType, string> = {
  mindmap: "Mappe Mentali",
  quiz: "Quiz",
  flashcard: "Flashcard",
  demo: "Demo",
  search: "Ricerche",
  diagram: "Diagrammi",
  timeline: "Timeline",
  summary: "Riassunti",
  formula: "Formule",
  calculator: "Calcolatrici",
  chart: "Grafici",
  webcam: "Foto",
  "webcam-standalone": "Foto Standalone",
  typing: "Digitazione",
  pdf: "PDF",
  homework: "Compiti",
  "study-kit": "Study Kit",
};

// ============================================================================
// Filter tabs
// ============================================================================

export const FILTER_TABS: {
  value: FilterType;
  label: string;
  icon?: typeof Bookmark;
}[] = [
  { value: "all", label: "Tutti" },
  { value: "bookmarked", label: "Preferiti", icon: BookmarkCheck },
  { value: "mindmap", label: "Mappe" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard" },
  { value: "summary", label: "Riassunti" },
  { value: "demo", label: "Demo" },
  { value: "homework", label: "Compiti" },
  { value: "webcam", label: "Foto" },
  { value: "pdf", label: "PDF" },
];
