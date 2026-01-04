// ============================================================================
// CALENDAR STORE - School events and homework tracking
// ============================================================================

import { create } from 'zustand';

// === TYPES ===

export interface SchoolEvent {
  id: string;
  title: string;
  subject: string; // maps to maestro subject
  type: 'test' | 'homework' | 'project' | 'lesson' | 'exam';
  date: Date;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  maestroSuggested?: string; // recommended maestro id
}

// Subject to Maestro ID mapping
const SUBJECT_TO_MAESTRO: Record<string, string> = {
  mathematics: 'euclide-matematica',
  math: 'euclide-matematica',
  matematica: 'euclide-matematica',
  history: 'clio-storia',
  storia: 'clio-storia',
  italian: 'dante-italiano',
  italiano: 'dante-italiano',
  literature: 'dante-italiano',
  letteratura: 'dante-italiano',
  english: 'shakespeare-english',
  inglese: 'shakespeare-english',
  science: 'curie-scienze',
  scienze: 'curie-scienze',
  physics: 'einstein-fisica',
  fisica: 'einstein-fisica',
  chemistry: 'curie-scienze',
  chimica: 'curie-scienze',
  biology: 'darwin-biologia',
  biologia: 'darwin-biologia',
  art: 'leonardo-arte',
  arte: 'leonardo-arte',
  philosophy: 'socrate-filosofia',
  filosofia: 'socrate-filosofia',
  geography: 'colombo-geografia',
  geografia: 'colombo-geografia',
  music: 'mozart-musica',
  musica: 'mozart-musica',
  latin: 'cicerone-latino',
  latino: 'cicerone-latino',
  greek: 'aristotele-greco',
  greco: 'aristotele-greco',
};

// === STORE ===

interface CalendarState {
  events: SchoolEvent[];
  // Actions
  addEvent: (event: Omit<SchoolEvent, 'id' | 'completed'>) => void;
  updateEvent: (id: string, updates: Partial<SchoolEvent>) => void;
  deleteEvent: (id: string) => void;
  toggleCompleted: (id: string) => void;
  getUpcomingEvents: (days: number) => SchoolEvent[];
  getEventsBySubject: (subject: string) => SchoolEvent[];
  getSuggestedMaestri: () => Array<{ maestroId: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
}

export const useCalendarStore = create<CalendarState>()(
  (set, get) => ({
      events: [],

      addEvent: (event) =>
        set((state) => {
          const subjectLower = event.subject.toLowerCase();
          const maestroId = SUBJECT_TO_MAESTRO[subjectLower];
          return {
            events: [
              ...state.events,
              {
                ...event,
                id: crypto.randomUUID(),
                completed: false,
                maestroSuggested: maestroId,
              },
            ],
          };
        }),

      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),

      toggleCompleted: (id) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, completed: !e.completed } : e
          ),
        })),

      getUpcomingEvents: (days) => {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return get()
          .events.filter(
            (e) => !e.completed && new Date(e.date) >= now && new Date(e.date) <= future
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },

      getEventsBySubject: (subject) => {
        return get().events.filter(
          (e) => e.subject.toLowerCase() === subject.toLowerCase()
        );
      },

      getSuggestedMaestri: () => {
        const upcoming = get().getUpcomingEvents(7);
        const suggestions: Map<string, { count: number; nearestDays: number; types: Set<string> }> = new Map();

        const now = new Date();
        upcoming.forEach((event) => {
          const maestroId = event.maestroSuggested;
          if (!maestroId) return;

          const daysUntil = Math.ceil(
            (new Date(event.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          if (suggestions.has(maestroId)) {
            const existing = suggestions.get(maestroId)!;
            existing.count++;
            existing.nearestDays = Math.min(existing.nearestDays, daysUntil);
            existing.types.add(event.type);
          } else {
            suggestions.set(maestroId, {
              count: 1,
              nearestDays: daysUntil,
              types: new Set([event.type]),
            });
          }
        });

        return Array.from(suggestions.entries())
          .map(([maestroId, data]) => {
            let priority: 'high' | 'medium' | 'low' = 'low';
            let reason = '';

            if (data.nearestDays <= 1) {
              priority = 'high';
              reason = data.types.has('exam') || data.types.has('test')
                ? 'Test tomorrow - review now!'
                : 'Event tomorrow';
            } else if (data.nearestDays <= 3) {
              priority = 'high';
              reason = `${data.count} event${data.count > 1 ? 's' : ''} in ${data.nearestDays} days`;
            } else if (data.nearestDays <= 5) {
              priority = 'medium';
              reason = `Prepare for upcoming ${Array.from(data.types).join('/')}`;
            } else {
              priority = 'low';
              reason = `${data.count} event${data.count > 1 ? 's' : ''} this week`;
            }

            return { maestroId, reason, priority };
          })
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });
      },
    })
);
