'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Brain,
  FileQuestion,
  Layers,
  Globe,
  MessageCircle,
  Home,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

const showcaseNavItems = [
  {
    href: '/showcase',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/showcase/maestri',
    label: 'Professori',
    icon: GraduationCap,
  },
  {
    href: '/showcase/mindmaps',
    label: 'Mappe Mentali',
    icon: Brain,
  },
  {
    href: '/showcase/quiz',
    label: 'Quiz',
    icon: FileQuestion,
  },
  {
    href: '/showcase/flashcards',
    label: 'Flashcards',
    icon: Layers,
  },
  {
    href: '/showcase/solar-system',
    label: 'Sistema Solare',
    icon: Globe,
  },
  {
    href: '/showcase/chat',
    label: 'Chat Simulata',
    icon: MessageCircle,
  },
];

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Showcase Banner - Sticky */}
      <div className="sticky top-0 z-50 bg-amber-500/90 backdrop-blur-sm border-b border-amber-600">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-950">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium text-sm">
              Modalita Showcase - Configura un LLM per le funzionalita complete
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-1 bg-white/90 hover:bg-white text-amber-900 text-sm font-medium rounded-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Vai all&apos;App
            </Link>
            <Link
              href="/landing"
              className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configura LLM
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/showcase" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/logo-brain.png" alt="MirrorBuddy" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MirrorBuddy</h1>
              <p className="text-xs text-white/60">The school we wished existed</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-semibold rounded-full uppercase tracking-wide">
              Showcase
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-120px)] border-r border-white/10 bg-black/10">
          <nav className="p-4 space-y-1">
            {showcaseNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${
                      isActive
                        ? 'bg-purple-500/30 text-white border border-purple-500/50'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10 z-40">
        <div className="flex justify-around py-2">
          {showcaseNavItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
                  ${isActive ? 'text-purple-400' : 'text-white/60'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
