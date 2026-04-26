/**
 * Custom hooks for Teacher Diary filtering and grouping logic
 */

import { useMemo } from 'react';
import { getMaestroById } from '@/data/maestri';
import { CATEGORY_LABELS } from './constants';
import type { DiaryEntry } from './types';

interface MaestroOption {
  id: string;
  name: string;
}

interface FilterParams {
  entries: DiaryEntry[];
  selectedMaestro: string;
  selectedSubject: string;
  selectedPeriod: string;
  searchQuery: string;
}

/**
 * Get unique Maestri from entries
 */
export function useUniqueMaestri(entries: DiaryEntry[]): MaestroOption[] {
  return useMemo(() => {
    const unique = new Set(entries.map((e) => e.maestroId));
    return Array.from(unique).map((id) => {
      const maestro = getMaestroById(id);
      return { id, name: maestro?.displayName || id };
    });
  }, [entries]);
}

/**
 * Get unique subjects from entries
 */
export function useUniqueSubjects(entries: DiaryEntry[]): string[] {
  return useMemo(() => {
    const unique = new Set(entries.map((e) => e.subject).filter(Boolean));
    return Array.from(unique);
  }, [entries]);
}

/**
 * Filter entries based on maestro, subject, period, and search query
 */
export function useFilteredEntries({
  entries,
  selectedMaestro,
  selectedSubject,
  selectedPeriod,
  searchQuery,
}: FilterParams): DiaryEntry[] {
  return useMemo(() => {
    let filtered = [...entries];

    // Filter by maestro
    if (selectedMaestro !== 'all') {
      filtered = filtered.filter((e) => e.maestroId === selectedMaestro);
    }

    // Filter by subject
    if (selectedSubject !== 'all') {
      filtered = filtered.filter((e) => e.subject === selectedSubject);
    }

    // Filter by period
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const periods: Record<string, number> = {
        week: 7,
        month: 30,
        '3months': 90,
      };
      const days = periods[selectedPeriod] || 365;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= cutoff);
    }

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.observation.toLowerCase().includes(query) ||
          e.maestroName.toLowerCase().includes(query) ||
          (CATEGORY_LABELS[e.category] || '').toLowerCase().includes(query)
      );
    }

    // Sort by most recent
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries, selectedMaestro, selectedSubject, selectedPeriod, searchQuery]);
}

/**
 * Group filtered entries by date
 */
export function useGroupedByDate(
  filteredEntries: DiaryEntry[]
): Record<string, DiaryEntry[]> {
  return useMemo(() => {
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
}
