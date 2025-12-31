'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  BookOpen,
  Calendar,
  Filter,
  ChevronDown,
  Lightbulb,
  TrendingUp,
  Star,
  Clock,
  MessageCircle,
  Search,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getMaestroById, SUBJECT_NAMES } from '@/data/maestri';
import { getParentSuggestion, getMaestroSubject } from '@/lib/profile/parent-suggestions';
import type { ObservationCategory } from '@/types';

/**
 * Diary entry from a Maestro's perspective
 */
export interface DiaryEntry {
  id: string;
  maestroId: string;
  maestroName: string;
  subject: string;
  category: ObservationCategory;
  observation: string;
  isStrength: boolean;
  confidence: number;
  occurrences: number;
  createdAt: Date;
  lastSeen: Date;
}

interface TeacherDiaryProps {
  entries: DiaryEntry[];
  studentName: string;
  isLoading?: boolean;
}

// Italian labels for observation categories
const CATEGORY_LABELS: Record<ObservationCategory, string> = {
  logical_reasoning: 'Ragionamento Logico',
  mathematical_intuition: 'Intuizione Matematica',
  critical_thinking: 'Pensiero Critico',
  study_method: 'Metodo di Studio',
  verbal_expression: 'Espressione Verbale',
  linguistic_ability: 'Abilita Linguistiche',
  creativity: 'Creativita',
  artistic_sensitivity: 'Sensibilita Artistica',
  scientific_curiosity: 'Curiosita Scientifica',
  experimental_approach: 'Approccio Sperimentale',
  spatial_memory: 'Memoria Spaziale',
  historical_understanding: 'Comprensione Storica',
  philosophical_depth: 'Profondita Filosofica',
  physical_awareness: 'Consapevolezza Corporea',
  environmental_awareness: 'Consapevolezza Ambientale',
  narrative_skill: 'Abilita Narrative',
  collaborative_spirit: 'Spirito Collaborativo',
};

/**
 * TeacherDiary - Diario dei Professori
 *
 * Shows chronological observations from Maestri with suggestions for parents.
 * Part of Issue #57: Parent Dashboard improvements.
 */
export function TeacherDiary({ entries, studentName, isLoading }: TeacherDiaryProps) {
  const [selectedMaestro, setSelectedMaestro] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Get unique Professori and subjects from entries
  const professoriInEntries = useMemo(() => {
    const unique = new Set(entries.map(e => e.maestroId));
    return Array.from(unique).map(id => {
      const maestro = getMaestroById(id);
      return { id, name: maestro?.displayName || id };
    });
  }, [entries]);

  const subjectsInEntries = useMemo(() => {
    const unique = new Set(entries.map(e => e.subject).filter(Boolean));
    return Array.from(unique);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    if (selectedMaestro !== 'all') {
      filtered = filtered.filter(e => e.maestroId === selectedMaestro);
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(e => e.subject === selectedSubject);
    }

    if (selectedPeriod !== 'all') {
      const now = new Date();
      const periods: Record<string, number> = {
        'week': 7,
        'month': 30,
        '3months': 90,
      };
      const days = periods[selectedPeriod] || 365;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.createdAt) >= cutoff);
    }

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(e =>
        e.observation.toLowerCase().includes(query) ||
        e.maestroName.toLowerCase().includes(query) ||
        (CATEGORY_LABELS[e.category] || '').toLowerCase().includes(query)
      );
    }

    // Sort by most recent
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries, selectedMaestro, selectedSubject, selectedPeriod, searchQuery]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, DiaryEntry[]> = {};

    for (const entry of filteredEntries) {
      const date = new Date(entry.createdAt).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    }

    return groups;
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <BookOpen className="h-6 w-6 text-indigo-500" />
            Diario dei Professori
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Osservazioni e suggerimenti dei Professori su {studentName}
          </p>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mt-2 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca nelle osservazioni..."
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Cancella ricerca"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Filtri:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={selectedMaestro} onValueChange={setSelectedMaestro}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Tutti i Professori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i Professori</SelectItem>
                  {professoriInEntries.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Tutte le materie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le materie</SelectItem>
                  {subjectsInEntries.map(s => (
                    <SelectItem key={s} value={s}>
                      {SUBJECT_NAMES[s] || getMaestroSubject(s) || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutto</SelectItem>
                  <SelectItem value="week">Ultima settimana</SelectItem>
                  <SelectItem value="month">Ultimo mese</SelectItem>
                  <SelectItem value="3months">Ultimi 3 mesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries grouped by date */}
      {Object.keys(groupedByDate).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Nessuna osservazione ancora
            </h3>
            <p className="text-sm text-slate-500">
              I Professori inizieranno a scrivere le loro osservazioni dopo le prime conversazioni con {studentName}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateEntries]) => (
            <div key={date} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{date}</span>
                <span className="text-xs">({dateEntries.length} osservazioni)</span>
              </div>

              {/* Entries for this date */}
              <div className="space-y-3">
                <AnimatePresence>
                  {dateEntries.map((entry, idx) => (
                    <DiaryEntryCard
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedEntry === entry.id}
                      onToggle={() => setExpandedEntry(
                        expandedEntry === entry.id ? null : entry.id
                      )}
                      delay={idx * 0.05}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual diary entry card
 */
function DiaryEntryCard({
  entry,
  isExpanded,
  onToggle,
  delay = 0,
}: {
  entry: DiaryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}) {
  const maestro = getMaestroById(entry.maestroId);
  const suggestion = getParentSuggestion(entry.category);
  const subjectName = SUBJECT_NAMES[entry.subject] || getMaestroSubject(entry.maestroId) || entry.subject;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={cn(
        'overflow-hidden transition-all duration-200',
        entry.isStrength
          ? 'border-amber-200 dark:border-amber-800'
          : 'border-blue-200 dark:border-blue-800'
      )}>
        <CardContent className="p-0">
          {/* Header with Maestro info */}
          <div
            className={cn(
              'p-4 cursor-pointer',
              entry.isStrength
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
            )}
            onClick={onToggle}
          >
            <div className="flex items-start gap-4">
              {/* Maestro avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                  <Image
                    src={maestro?.avatar || `/maestri/${entry.maestroId}.png`}
                    alt={maestro?.displayName || entry.maestroName}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className={cn(
                  'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                  entry.isStrength ? 'bg-amber-400' : 'bg-blue-400'
                )}>
                  {entry.isStrength ? (
                    <Star className="w-3 h-3 text-white" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>

              {/* Entry content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {maestro?.displayName || entry.maestroName}
                  </h4>
                  <span className="text-xs text-slate-500">-</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {subjectName}
                  </span>
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  &ldquo;{entry.observation}&rdquo;
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full',
                    entry.isStrength
                      ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                      : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                  )}>
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.occurrences}x
                  </span>
                  <span className="hidden sm:inline">
                    Confidenza: {Math.round(entry.confidence * 100)}%
                  </span>
                  <span className="sm:hidden">
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Expand indicator */}
              <ChevronDown className={cn(
                'w-5 h-5 text-slate-400 transition-transform',
                isExpanded && 'rotate-180'
              )} />
            </div>
          </div>

          {/* Expanded suggestion for parents */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h5 className="font-semibold text-slate-800 dark:text-slate-200">
                        Suggerimenti per i genitori
                      </h5>

                      <div className="space-y-2 text-sm">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Attivita a casa:
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.homeActivity}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Come comunicare:
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.communicationTip}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Ambiente di studio:
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {suggestion.environmentTip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default TeacherDiary;
