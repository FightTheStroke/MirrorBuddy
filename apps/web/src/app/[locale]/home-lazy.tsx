"use client";

import dynamic from "next/dynamic";
import { ViewSkeleton, SessionSkeleton } from "@/components/ui/skeleton";

// Lazy load heavy components not visible on initial render
export const LazyMaestroSession = dynamic(
  () =>
    import("@/components/maestros/maestro-session").then((m) => ({
      default: m.MaestroSession,
    })),
  { loading: () => <SessionSkeleton />, ssr: false },
);

export const LazyCharacterChatView = dynamic(
  () =>
    import("@/components/conversation/character-chat-view").then((m) => ({
      default: m.CharacterChatView,
    })),
  { loading: () => <SessionSkeleton />, ssr: false },
);

export const LazyAstuccioView = dynamic(
  () =>
    import("@/app/[locale]/astuccio/components/astuccio-view").then((m) => ({
      default: m.AstuccioView,
    })),
  { loading: () => <ViewSkeleton />, ssr: false },
);

export const LazyZainoView = dynamic(
  () =>
    import("@/app/[locale]/supporti/components/zaino-view").then((m) => ({
      default: m.ZainoView,
    })),
  { loading: () => <ViewSkeleton />, ssr: false },
);

/**
 * Shell skeleton matching the home page layout.
 * Shown during initial hydration for perceived performance.
 */
export function HomeShellSkeleton({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <h1 className="sr-only">{title}</h1>
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm" />
      <div className="flex">
        <div className="hidden lg:block w-64 min-h-[calc(100vh-3.5rem)] border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
        <main className="flex-1 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
