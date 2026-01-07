'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToolLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backRoute?: string;
  className?: string;
}

export function ToolLayout({
  children,
  title,
  subtitle,
  backRoute = '/',
  className,
}: ToolLayoutProps) {
  const router = useRouter();

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-950', className)}>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(backRoute)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-slate-900 dark:text-white">{title}</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Home
          </Button>
        </div>
      </header>
      
      {subtitle && (
        <div className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10 dark:border-primary/20">
          <div className="container mx-auto px-4 py-2">
            <p className="text-sm text-primary dark:text-primary-400">{subtitle}</p>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
