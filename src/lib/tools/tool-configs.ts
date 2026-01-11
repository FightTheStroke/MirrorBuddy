/**
 * Tool Configurations
 * Separate upload, create, and search tool definitions
 */

import type { ToolType } from '@/types/tools';
import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  HelpCircle,
  Layers,
  Play,
  FileText,
  Upload,
  Camera,
  GitBranch,
  Clock,
  Calculator,
  BarChart3,
  BookOpen,
  Globe,
} from 'lucide-react';

export interface ToolConfig {
  type: ToolType;
  route: string;
  functionName: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: 'upload' | 'create' | 'search';
  requiresMaestro: boolean;
}

export const UPLOAD_TOOLS: Record<string, ToolConfig> = {
  pdf: {
    type: 'pdf',
    route: '/pdf',
    functionName: 'upload_pdf',
    label: 'Carica PDF',
    description: 'Carica un documento PDF e genera automaticamente materiali di studio',
    icon: Upload,
    category: 'upload',
    requiresMaestro: true,
  },
  webcam: {
    type: 'webcam',
    route: '/webcam',
    functionName: 'capture_webcam',
    label: 'Scatta Foto',
    description: 'Fotografa la lavagna o i tuoi appunti per generare materiali',
    icon: Camera,
    category: 'upload',
    requiresMaestro: true,
  },
  homework: {
    type: 'homework',
    route: '/homework',
    functionName: 'homework_help',
    label: 'Aiuto Compiti',
    description: 'Carica un esercizio e ricevi assistenza guidata passo-passo',
    icon: BookOpen,
    category: 'upload',
    requiresMaestro: true,
  },
  'study-kit': {
    type: 'study-kit',
    route: '/study-kit',
    functionName: 'study_kit',
    label: 'Study Kit',
    description: 'Carica un PDF e genera automaticamente riassunti, mappe, demo e quiz',
    icon: BookOpen,
    category: 'upload',
    requiresMaestro: false,
  },
};

export const CREATE_TOOLS: Record<string, ToolConfig> = {
  mindmap: {
    type: 'mindmap',
    route: '/mindmap',
    functionName: 'create_mindmap',
    label: 'Mappa Mentale',
    description: 'Visualizza i collegamenti tra concetti con mappe interattive',
    icon: Brain,
    category: 'create',
    requiresMaestro: true,
  },
  quiz: {
    type: 'quiz',
    route: '/quiz',
    functionName: 'create_quiz',
    label: 'Quiz',
    description: 'Verifica la tua comprensione con quiz personalizzati',
    icon: HelpCircle,
    category: 'create',
    requiresMaestro: true,
  },
  flashcard: {
    type: 'flashcard',
    route: '/flashcard',
    functionName: 'create_flashcards',
    label: 'Flashcard',
    description: 'Memorizza con flashcard intelligenti e ripetizione spaziata',
    icon: Layers,
    category: 'create',
    requiresMaestro: true,
  },
  demo: {
    type: 'demo',
    route: '/demo',
    functionName: 'create_demo',
    label: 'Demo Interattiva',
    description: 'Esplora concetti STEM con simulazioni interattive',
    icon: Play,
    category: 'create',
    requiresMaestro: true,
  },
  summary: {
    type: 'summary',
    route: '/summary',
    functionName: 'create_summary',
    label: 'Riassunto',
    description: 'Genera sintesi chiare e strutturate dei concetti chiave',
    icon: FileText,
    category: 'create',
    requiresMaestro: true,
  },
  diagram: {
    type: 'diagram',
    route: '/diagram',
    functionName: 'create_diagram',
    label: 'Diagramma',
    description: 'Crea diagrammi di flusso e schemi visivi',
    icon: GitBranch,
    category: 'create',
    requiresMaestro: true,
  },
  timeline: {
    type: 'timeline',
    route: '/timeline',
    functionName: 'create_timeline',
    label: 'Linea Temporale',
    description: 'Organizza eventi storici o sequenze in modo visivo',
    icon: Clock,
    category: 'create',
    requiresMaestro: true,
  },
  formula: {
    type: 'formula',
    route: '/formula',
    functionName: 'create_formula',
    label: 'Formula',
    description: 'Visualizza e comprendi formule matematiche e scientifiche',
    icon: Calculator,
    category: 'create',
    requiresMaestro: true,
  },
  chart: {
    type: 'chart',
    route: '/chart',
    functionName: 'create_chart',
    label: 'Grafico',
    description: 'Crea grafici e visualizzazioni per dati e statistiche',
    icon: BarChart3,
    category: 'create',
    requiresMaestro: true,
  },
};

export const SEARCH_TOOLS: Record<string, ToolConfig> = {
  search: {
    type: 'search',
    route: '/search',
    functionName: 'web_search',
    label: 'Ricerca Web',
    description: 'Cerca informazioni, video e risorse educative sul web',
    icon: Globe,
    category: 'search',
    requiresMaestro: true,
  },
};
