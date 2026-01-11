'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Clock,
  BookOpen,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScheduledSession, DayOfWeek } from '@/lib/scheduler/types';
import { maestri } from '@/data/maestri';
import { DAYS_OF_WEEK, SUBJECTS, TIME_OPTIONS } from './weekly-schedule/constants';

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30m' },
  { value: 120, label: '2 ore' },
];

interface WeeklyScheduleProps {
  sessions: ScheduledSession[];
  onCreateSession: (data: Omit<ScheduledSession, 'id' | 'userId'>) => Promise<ScheduledSession | null>;
  onUpdateSession: (id: string, data: Partial<ScheduledSession>) => Promise<ScheduledSession | null>;
  onDeleteSession: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

interface SessionFormData {
  dayOfWeek: DayOfWeek;
  time: string;
  duration: number;
  subject: string;
  maestroId?: string;
  topic?: string;
}

export function WeeklySchedule({
  sessions,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  isLoading,
}: WeeklyScheduleProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    dayOfWeek: 1,
    time: '16:00',
    duration: 30,
    subject: 'matematica',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      if (editingId) {
        await onUpdateSession(editingId, formData);
      } else {
        await onCreateSession({
          ...formData,
          active: true,
          reminderOffset: 5,
          repeat: 'weekly',
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        dayOfWeek: 1 as DayOfWeek,
        time: '16:00',
        duration: 30,
        subject: 'matematica',
      });
    } finally {
      setSubmitting(false);
    }
  }, [editingId, formData, onCreateSession, onUpdateSession]);

  const handleEdit = useCallback((session: ScheduledSession) => {
    setFormData({
      dayOfWeek: session.dayOfWeek as DayOfWeek,
      time: session.time,
      duration: session.duration,
      subject: session.subject,
      maestroId: session.maestroId ?? undefined,
      topic: session.topic ?? undefined,
    });
    setEditingId(session.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await onDeleteSession(id);
  }, [onDeleteSession]);

  const getSessionsForDay = (dayOfWeek: number) => {
    return sessions
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getMaestroName = (maestroId?: string) => {
    if (!maestroId) return null;
    const maestro = maestri.find((m: { id: string; name: string }) => m.id === maestroId);
    return maestro?.name || null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Piano di Studio Settimanale
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setFormData({
              dayOfWeek: 1,
              time: '16:00',
              duration: 30,
              subject: 'matematica',
            });
            setShowForm(true);
          }}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Aggiungi
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 space-y-4">
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {editingId ? 'Modifica sessione' : 'Nuova sessione di studio'}
                </h4>

                {/* Day & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Giorno
                    </label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) as DayOfWeek })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Orario
                    </label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration & Subject */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Durata
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Materia
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {SUBJECTS.map((subj) => (
                        <option key={subj.value} value={subj.value}>
                          {subj.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Topic */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Argomento (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.topic || ''}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Es: Teorema di Pitagora"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    disabled={submitting}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {submitting ? 'Salvataggio...' : editingId ? 'Salva' : 'Aggiungi'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekly Grid */}
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySessions = getSessionsForDay(day.value);
            const isToday = new Date().getDay() === day.value;

            return (
              <div
                key={day.value}
                className={cn(
                  'p-3 rounded-lg border',
                  isToday
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'font-medium text-sm',
                    isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {day.label}
                    {isToday && <span className="ml-2 text-xs">(oggi)</span>}
                  </span>
                </div>

                {daySessions.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    Nessuna sessione programmata
                  </p>
                ) : (
                  <div className="space-y-2">
                    {daySessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{session.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {SUBJECTS.find((s) => s.value === session.subject)?.label || session.subject}
                            </span>
                            {session.topic && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                - {session.topic}
                              </span>
                            )}
                          </div>
                          {session.maestroId && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              {getMaestroName(session.maestroId)}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {session.duration} min
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(session)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label="Modifica"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                            aria-label="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {sessions.length === 0 && !showForm && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessuna sessione programmata.</p>
            <p className="text-sm mt-1">Clicca &quot;Aggiungi&quot; per creare il tuo piano di studio!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
