/**
 * @file constants.ts
 * @brief Constants for zaino view
 */

import {
  Backpack,
  BookmarkCheck,
  Brain,
  HelpCircle,
  Layers,
  Play,
  FileText,
  Camera,
  GitBranch,
  Clock,
  Calculator,
  BarChart3,
  BookOpen,
  Route,
} from 'lucide-react';
import type { ToolType } from '@/types/tools';

export const TYPE_FILTERS: Array<{
  id: ToolType | 'all' | 'bookmarked' | 'percorsi';
  label: string;
  icon: typeof Brain;
  color: string;
}> = [
  { id: 'all', label: 'Tutti', icon: Backpack, color: 'slate' },
  { id: 'percorsi', label: 'Percorsi', icon: Route, color: 'sky' },
  { id: 'bookmarked', label: 'Preferiti', icon: BookmarkCheck, color: 'amber' },
  { id: 'mindmap', label: 'Mappe', icon: Brain, color: 'blue' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'green' },
  { id: 'flashcard', label: 'Flashcard', icon: Layers, color: 'orange' },
  { id: 'summary', label: 'Riassunti', icon: FileText, color: 'cyan' },
  { id: 'demo', label: 'Demo', icon: Play, color: 'purple' },
  { id: 'diagram', label: 'Diagrammi', icon: GitBranch, color: 'indigo' },
  { id: 'timeline', label: 'Timeline', icon: Clock, color: 'amber' },
  { id: 'formula', label: 'Formule', icon: Calculator, color: 'rose' },
  { id: 'chart', label: 'Grafici', icon: BarChart3, color: 'emerald' },
  { id: 'homework', label: 'Compiti', icon: BookOpen, color: 'violet' },
  { id: 'webcam', label: 'Foto', icon: Camera, color: 'pink' },
  { id: 'pdf', label: 'PDF', icon: FileText, color: 'teal' },
];

export const CHIP_COLORS: Record<
  string,
  { bg: string; text: string; border: string; activeBg: string }
> = {
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    activeBg: 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    activeBg: 'bg-amber-500 dark:bg-amber-400 text-white dark:text-amber-950',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    activeBg: 'bg-blue-500 dark:bg-blue-400 text-white dark:text-blue-950',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    activeBg: 'bg-green-500 dark:bg-green-400 text-white dark:text-green-950',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    activeBg: 'bg-orange-500 dark:bg-orange-400 text-white dark:text-orange-950',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    activeBg: 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-cyan-950',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    activeBg: 'bg-purple-500 dark:bg-purple-400 text-white dark:text-purple-950',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    activeBg: 'bg-indigo-500 dark:bg-indigo-400 text-white dark:text-indigo-950',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    activeBg: 'bg-rose-500 dark:bg-rose-400 text-white dark:text-rose-950',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    activeBg: 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    activeBg: 'bg-violet-500 dark:bg-violet-400 text-white dark:text-violet-950',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    activeBg: 'bg-pink-500 dark:bg-pink-400 text-white dark:text-pink-950',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    activeBg: 'bg-teal-500 dark:bg-teal-400 text-white dark:text-teal-950',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    activeBg: 'bg-sky-500 dark:bg-sky-400 text-white dark:text-sky-950',
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const DATE_FILTER_IDS = ['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'all'];

export const DATE_FILTERS: Array<{
  id: string;
  label: string;
  icon: typeof Clock;
  color: string;
  getRange: () => { start: Date; end: Date };
}> = [
  {
    id: 'today',
    label: 'Oggi',
    icon: Clock,
    color: 'emerald',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'yesterday',
    label: 'Ieri',
    icon: Clock,
    color: 'green',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'week',
    label: 'Questa settimana',
    icon: Clock,
    color: 'teal',
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'month',
    label: 'Questo mese',
    icon: Clock,
    color: 'cyan',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'quarter',
    label: 'Ultimi 3 mesi',
    icon: Clock,
    color: 'blue',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'year',
    label: 'Questo anno',
    icon: Clock,
    color: 'indigo',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: 'all',
    label: 'Tutto',
    icon: Clock,
    color: 'slate',
    getRange: () => {
      const start = new Date(2000, 0, 1);
      const end = new Date(2100, 11, 31);
      return { start, end };
    },
  },
];

