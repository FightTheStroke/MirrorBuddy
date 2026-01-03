'use client';

import dynamic from 'next/dynamic';
import { ViewSkeleton } from '@/components/ui/skeleton';

// Lazy load heavy education views
export const LazyQuizView = dynamic(
  () => import('./quiz-view').then((mod) => ({ default: mod.QuizView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyFlashcardsView = dynamic(
  () => import('./flashcards-view').then((mod) => ({ default: mod.FlashcardsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyMindmapsView = dynamic(
  () => import('./mindmaps-view').then((mod) => ({ default: mod.MindmapsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazySummariesView = dynamic(
  () => import('./summaries-view').then((mod) => ({ default: mod.SummariesView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyHomeworkHelpView = dynamic(
  () => import('./homework-help-view').then((mod) => ({ default: mod.HomeworkHelpView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyCalendarView = dynamic(
  () => import('./calendar-view').then((mod) => ({ default: mod.CalendarView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyHTMLSnippetsView = dynamic(
  () => import('./html-snippets-view').then((mod) => ({ default: mod.HTMLSnippetsView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);

export const LazyArchiveView = dynamic(
  () => import('./archive-view').then((mod) => ({ default: mod.ArchiveView })),
  {
    loading: () => <ViewSkeleton />,
    ssr: false,
  }
);
