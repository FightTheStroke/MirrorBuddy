'use client';

/**
 * TeacherDiary - Diario dei Professori
 * Shows chronological observations from Maestri with suggestions for parents.
 * Part of Issue #57: Parent Dashboard improvements.
 */

import { useState } from 'react';
import { BookOpen, Calendar, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUniqueMaestri, useUniqueSubjects, useFilteredEntries, useGroupedByDate } from './hooks';
import { TeacherDiaryFilters } from './filters';
import { DiaryEntryCard } from './diary-entry-card';
import type { TeacherDiaryProps } from './types';

export function TeacherDiary({
  entries,
  studentName,
  isLoading,
  onTalkToMaestro,
}: TeacherDiaryProps) {
  const t = useTranslations('settings.parentDashboard');
  const [selectedMaestro, setSelectedMaestro] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Get unique options
  const maestriOptions = useUniqueMaestri(entries);
  const subjectsOptions = useUniqueSubjects(entries);

  // Filter entries
  const filteredEntries = useFilteredEntries({
    entries,
    selectedMaestro,
    selectedSubject,
    selectedPeriod,
    searchQuery,
  });

  // Group by date
  const groupedByDate = useGroupedByDate(filteredEntries);

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
            {t('diaryTitle')}
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {t('diarySubtitle', { name: studentName })}
          </p>
        </CardHeader>
        <CardContent>
          <TeacherDiaryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedMaestro={selectedMaestro}
            onMaestroChange={setSelectedMaestro}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            maestriOptions={maestriOptions}
            subjectsOptions={subjectsOptions}
          />
        </CardContent>
      </Card>

      {/* Entries grouped by date */}
      {Object.keys(groupedByDate).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('noObservationsEmpty')}
            </h3>
            <p className="text-sm text-slate-500">
              {t('observationsStart', { name: studentName })}
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
                <span className="text-xs">({dateEntries.length} {t("osservazioni")}</span>
              </div>

              {/* Entries for this date */}
              <div className="space-y-3">
                {dateEntries.map((entry, idx) => (
                  <DiaryEntryCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntry === entry.id}
                    onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    onTalkToMaestro={onTalkToMaestro}
                    delay={idx * 0.05}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
