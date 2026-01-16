'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DAYS_OF_WEEK, SUBJECTS, TIME_OPTIONS } from './constants';
import { DURATION_OPTIONS } from './duration-options';
import type { DayOfWeek, ScheduledSession } from '@/lib/scheduler/types';

const INITIAL_FORM = {
  dayOfWeek: 1 as DayOfWeek,
  time: '16:00',
  duration: 30,
  subject: 'matematica',
};

interface SessionFormProps {
  showForm: boolean;
  editingId: string | null;
  formData: any;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onFormChange: (data: any) => void;
}

export function SessionForm({
  showForm,
  editingId,
  formData,
  submitting,
  onSubmit,
  onCancel,
  onFormChange,
}: SessionFormProps) {
  return (
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Giorno
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => onFormChange({ ...formData, dayOfWeek: Number(e.target.value) as DayOfWeek })}
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
                  onChange={(e) => onFormChange({ ...formData, time: e.target.value })}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Durata
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => onFormChange({ ...formData, duration: Number(e.target.value) })}
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
                  onChange={(e) => onFormChange({ ...formData, subject: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Argomento (opzionale)
              </label>
              <input
                type="text"
                value={formData.topic || ''}
                onChange={(e) => onFormChange({ ...formData, topic: e.target.value })}
                placeholder="Es: Teorema di Pitagora"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={submitting}
              >
                <X className="w-4 h-4 mr-1" />
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={onSubmit}
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
  );
}

export { INITIAL_FORM };
