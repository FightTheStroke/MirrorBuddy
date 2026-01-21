/**
 * Constants for Material Card
 */

import React from "react";
import { Brain, HelpCircle, Layers, FileText } from "lucide-react";
import type { ToolType } from "@/types/tools";

// Tool icons mapping
export const TYPE_ICONS: Record<ToolType, React.ReactElement> = {
  mindmap: React.createElement(Brain, { className: "w-4 h-4" }),
  quiz: React.createElement(HelpCircle, { className: "w-4 h-4" }),
  flashcard: React.createElement(Layers, { className: "w-4 h-4" }),
  summary: React.createElement(FileText, { className: "w-4 h-4" }),
  demo: React.createElement(FileText, { className: "w-4 h-4" }),
  diagram: React.createElement(FileText, { className: "w-4 h-4" }),
  timeline: React.createElement(FileText, { className: "w-4 h-4" }),
  formula: React.createElement(FileText, { className: "w-4 h-4" }),
  calculator: React.createElement(FileText, { className: "w-4 h-4" }),
  chart: React.createElement(FileText, { className: "w-4 h-4" }),
  pdf: React.createElement(FileText, { className: "w-4 h-4" }),
  webcam: React.createElement(FileText, { className: "w-4 h-4" }),
  homework: React.createElement(FileText, { className: "w-4 h-4" }),
  search: React.createElement(FileText, { className: "w-4 h-4" }),
  typing: React.createElement(FileText, { className: "w-4 h-4" }),
  "study-kit": React.createElement(FileText, { className: "w-4 h-4" }),
};

export const TYPE_COLORS: Record<ToolType, string> = {
  mindmap: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  quiz: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  flashcard:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  summary:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  demo: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  diagram:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  timeline: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  formula: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  calculator:
    "bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400",
  chart:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  pdf: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  webcam: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  homework:
    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  search: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  typing:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  "study-kit":
    "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
};

export const TYPE_LABELS: Record<ToolType, string> = {
  mindmap: "Mappa Mentale",
  quiz: "Quiz",
  flashcard: "Flashcard",
  summary: "Riassunto",
  demo: "Demo",
  diagram: "Diagramma",
  timeline: "Timeline",
  formula: "Formula",
  calculator: "Calcolatrice",
  chart: "Grafico",
  pdf: "PDF",
  webcam: "Immagine",
  homework: "Compito",
  search: "Ricerca",
  typing: "Impara a Digitare",
  "study-kit": "Study Kit",
};
