/**
 * @file constants.ts
 * @brief Constants for focus tool layout
 */

import {
  GraduationCap,
  Brain,
  BookOpen,
  Network,
  FileText,
  Target,
  Trophy,
  Settings,
} from 'lucide-react';
import type { ToolType } from '@/types/tools';

export const SIDEBAR_WIDTH_EXPANDED = 'w-48';
export const SIDEBAR_WIDTH_COLLAPSED = 'w-14';

export const FUNCTION_NAME_TO_TOOL_TYPE: Record<string, ToolType> = {
  create_mindmap: 'mindmap',
  create_quiz: 'quiz',
  create_demo: 'demo',
  web_search: 'search',
  create_flashcards: 'flashcard',
  create_diagram: 'diagram',
  create_timeline: 'timeline',
  create_summary: 'summary',
  open_student_summary: 'summary',
};

export const TOOL_NAMES: Record<ToolType, string> = {
  mindmap: 'Mappa Mentale',
  quiz: 'Quiz',
  flashcard: 'Flashcards',
  summary: 'Riassunto',
  demo: 'Demo Interattiva',
  diagram: 'Diagramma',
  timeline: 'Linea del Tempo',
  formula: 'Formula',
  chart: 'Grafico',
  search: 'Ricerca',
  webcam: 'Foto',
  pdf: 'PDF',
  homework: 'Compiti',
  'study-kit': 'Study Kit',
};

export const TOOL_NAMES_LOWERCASE: Record<ToolType, string> = {
  mindmap: 'mappa mentale',
  quiz: 'quiz',
  flashcard: 'flashcard',
  summary: 'riassunto',
  demo: 'demo interattiva',
  diagram: 'diagramma',
  timeline: 'linea del tempo',
  formula: 'formula',
  chart: 'grafico',
  search: 'ricerca',
  webcam: 'foto',
  pdf: 'PDF',
  homework: 'compiti',
  'study-kit': 'study kit',
};

export const SIDEBAR_ITEMS = [
  { id: 'maestri', label: 'Professori', icon: GraduationCap },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
  { id: 'mindmaps', label: 'Mappe Mentali', icon: Network },
  { id: 'summaries', label: 'Riassunti', icon: FileText },
  { id: 'homework', label: 'Materiali', icon: Target },
  { id: 'progress', label: 'Progressi', icon: Trophy },
  { id: 'settings', label: 'Impostazioni', icon: Settings },
];

