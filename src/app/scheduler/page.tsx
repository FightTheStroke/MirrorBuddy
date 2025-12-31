'use client';

import { motion } from 'framer-motion';
import { Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WeeklySchedule, NotificationPreferences } from '@/components/scheduler';
import { useScheduler } from '@/lib/hooks/use-scheduler';

/**
 * Scheduler Page - Study Scheduler & Smart Notifications (Issue #27)
 * Standalone page for managing weekly study schedule and notification preferences.
 */
export default function SchedulerPage() {
  const {
    schedule,
    isLoading,
    isAuthenticated,
    createSession,
    updateSession,
    deleteSession,
    updatePreferences,
  } = useScheduler();

  // Show auth message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Accesso richiesto
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Devi effettuare l&apos;accesso per gestire il tuo piano di studio.
            </p>
            <Link href="/">
              <Button>Torna alla home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <Link href="/" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Torna alla home
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              Piano di Studio
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Pianifica le tue sessioni settimanali e gestisci le notifiche
            </p>
          </div>
        </motion.div>

        {/* Weekly Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <WeeklySchedule
            sessions={schedule?.weeklyPlan || []}
            onCreateSession={createSession}
            onUpdateSession={updateSession}
            onDeleteSession={deleteSession}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <NotificationPreferences
            preferences={schedule?.preferences ?? {
              enabled: true,
              pushEnabled: false,
              inAppEnabled: true,
              voiceEnabled: true,
              minIntervalMinutes: 30,
              streakWarningTime: '21:00',
            }}
            onUpdate={updatePreferences}
            isLoading={isLoading}
          />
        </motion.div>
      </div>
    </div>
  );
}
