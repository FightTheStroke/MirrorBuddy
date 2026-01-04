// ============================================================================
// HTML SNIPPETS STORE - Code snippets and projects
// ============================================================================

import { create } from 'zustand';

// === TYPES ===

export interface HTMLSnippet {
  id: string;
  title: string;
  description?: string;
  code: string; // Full HTML content (single file with embedded CSS/JS)
  subject?: string;
  maestroId?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// === STORE ===

interface HTMLSnippetsState {
  snippets: HTMLSnippet[];
  // Actions
  addSnippet: (snippet: Omit<HTMLSnippet, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSnippet: (id: string, updates: Partial<HTMLSnippet>) => void;
  deleteSnippet: (id: string) => void;
  getSnippetsBySubject: (subject: string) => HTMLSnippet[];
  getSnippetsByMaestro: (maestroId: string) => HTMLSnippet[];
}

export const useHTMLSnippetsStore = create<HTMLSnippetsState>()(
  (set, get) => ({
      snippets: [],

      addSnippet: (snippet) => {
        const id = crypto.randomUUID();
        const now = new Date();
        set((state) => ({
          snippets: [
            {
              ...snippet,
              id,
              createdAt: now,
              updatedAt: now,
            },
            ...state.snippets,
          ],
        }));
        return id;
      },

      updateSnippet: (id, updates) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),

      deleteSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),

      getSnippetsBySubject: (subject) => {
        return get().snippets.filter(
          (s) => s.subject?.toLowerCase() === subject.toLowerCase()
        );
      },

      getSnippetsByMaestro: (maestroId) => {
        return get().snippets.filter((s) => s.maestroId === maestroId);
      },
    })
);
