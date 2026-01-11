/**
 * Subject Metadata
 * Colors, names, and icons for all subjects
 */

import type { Subject } from '@/types';

export const subjectColors: Record<Subject, string> = {
  mathematics: '#3B82F6',    // Blue
  physics: '#8B5CF6',        // Purple
  chemistry: '#10B981',      // Emerald
  biology: '#22C55E',        // Green
  history: '#F59E0B',        // Amber
  geography: '#06B6D4',      // Cyan
  italian: '#EF4444',        // Red
  english: '#EC4899',        // Pink
  spanish: '#E74C3C',        // Spanish Red
  art: '#F97316',            // Orange
  music: '#A855F7',          // Violet
  civics: '#6366F1',         // Indigo
  economics: '#14B8A6',      // Teal
  computerScience: '#64748B', // Slate
  health: '#F43F5E',         // Rose
  philosophy: '#8B5CF6',     // Purple
  internationalLaw: '#0EA5E9', // Sky
  storytelling: '#E63946',   // Red (Chris)
  supercazzola: '#722F37',   // Wine (Mascetti)
};

export const subjectNames: Record<Subject, string> = {
  mathematics: 'Matematica',
  physics: 'Fisica',
  chemistry: 'Chimica',
  biology: 'Biologia',
  history: 'Storia',
  geography: 'Geografia',
  italian: 'Italiano',
  english: 'Inglese',
  spanish: 'Spagnolo',
  art: 'Arte',
  music: 'Musica',
  civics: 'Educazione Civica',
  economics: 'Economia',
  computerScience: 'Informatica',
  health: 'Salute',
  philosophy: 'Filosofia',
  internationalLaw: 'Diritto Internazionale',
  storytelling: 'Storytelling',
  supercazzola: 'Supercazzola',
};

export const subjectIcons: Record<Subject, string> = {
  mathematics: '📐',
  physics: '⚛️',
  chemistry: '🧪',
  biology: '🧬',
  history: '📜',
  geography: '🌍',
  italian: '📖',
  english: '🇬🇧',
  spanish: '🇪🇸',
  art: '🎨',
  music: '🎵',
  civics: '⚖️',
  economics: '📊',
  computerScience: '💻',
  health: '❤️',
  philosophy: '🤔',
  internationalLaw: '🌐',
  storytelling: '🎤',
  supercazzola: '🎭',
};

export const subjectLucideIconNames: Record<Subject, string> = {
  mathematics: 'Ruler',
  physics: 'Atom',
  chemistry: 'FlaskConical',
  biology: 'Dna',
  history: 'ScrollText',
  geography: 'Globe',
  italian: 'BookOpen',
  english: 'Languages',
  spanish: 'Languages',
  art: 'Palette',
  music: 'Music',
  civics: 'Scale',
  economics: 'TrendingUp',
  computerScience: 'Monitor',
  health: 'Heart',
  philosophy: 'Lightbulb',
  internationalLaw: 'Globe2',
  storytelling: 'Mic',
  supercazzola: 'Drama',
};
