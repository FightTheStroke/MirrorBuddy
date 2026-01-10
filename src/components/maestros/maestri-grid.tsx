'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  Ruler,
  Atom,
  FlaskConical,
  Dna,
  ScrollText,
  Globe,
  BookOpen,
  Languages,
  Palette,
  Music,
  Scale,
  TrendingUp,
  Monitor,
  Heart,
  Lightbulb,
  Globe2,
  Mic,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MaestroCard } from './maestro-card';
import { PersonalizedSuggestion } from './personalized-suggestion';
import { maestri, subjectNames, subjectColors, getAllSubjects } from '@/data';
import { cn } from '@/lib/utils';
import type { Maestro, Subject } from '@/types';

// Map subjects to Lucide icon components
const subjectLucideIcons: Record<Subject, LucideIcon> = {
  mathematics: Ruler,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  history: ScrollText,
  geography: Globe,
  italian: BookOpen,
  english: Languages,
  spanish: Languages,
  art: Palette,
  music: Music,
  civics: Scale,
  economics: TrendingUp,
  computerScience: Monitor,
  health: Heart,
  philosophy: Lightbulb,
  internationalLaw: Globe2,
  storytelling: Mic,
};

type SessionMode = 'voice' | 'chat';

interface MaestriGridProps {
  onMaestroSelect?: (maestro: Maestro, mode: SessionMode) => void;
}

export function MaestriGrid({ onMaestroSelect }: MaestriGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');

  const subjects = getAllSubjects();

  // Filter and sort maestri alphabetically by name
  const filteredMaestri = maestri
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subjectNames[m.subject].toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject =
        selectedSubject === 'all' || m.subject === selectedSubject;

      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  // Click on professore goes directly to voice
  const handleSelect = (maestro: Maestro) => {
    if (onMaestroSelect) {
      onMaestroSelect(maestro, 'voice');
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Hero */}
      <PersonalizedSuggestion onMaestroSelect={handleSelect} />

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            aria-label="Cerca professore o materia"
          />
        </div>
        <button
          onClick={() => setSelectedSubject('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            selectedSubject === 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          Tutti
        </button>
        {subjects.map((subject) => {
          const isSelected = selectedSubject === subject;
          const SubjectIcon = subjectLucideIcons[subject];
          return (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isSelected
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              style={isSelected ? { backgroundColor: subjectColors[subject] } : undefined}
              aria-pressed={isSelected}
            >
              <SubjectIcon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{subjectNames[subject]}</span>
            </button>
          );
        })}
      </div>

      {/* Grid - compact cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredMaestri.map((maestro, index) => (
          <MaestroCard key={maestro.id} maestro={maestro} onSelect={handleSelect} index={index} />
        ))}
      </div>

      {/* Empty state */}
      {filteredMaestri.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            Nessun professore trovato
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      )}

    </div>
  );
}
