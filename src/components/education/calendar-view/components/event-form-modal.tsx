/**
 * @file event-form-modal.tsx
 * @brief Event form modal component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVENT_TYPES, SUBJECTS, type Priority } from '../constants';
import type { NewEventForm } from '../hooks/use-calendar-view';
import type { SchoolEvent } from '@/lib/stores';
import { cn } from '@/lib/utils';

interface EventFormModalProps {
  show: boolean;
  editingEvent: SchoolEvent | null;
  form: NewEventForm;
  onFormChange: (form: NewEventForm) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EventFormModal({
  show,
  editingEvent,
  form,
  onFormChange,
  onSave,
  onCancel,
}: EventFormModalProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingEvent ? 'Modifica Evento' : 'Nuovo Evento'}
            </h3>
            <button
              onClick={onCancel}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Titolo
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  onFormChange({ ...form, title: e.target.value })
                }
                placeholder="Es: Verifica di matematica"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Materia
              </label>
              <select
                value={form.subject}
                onChange={(e) =>
                  onFormChange({ ...form, subject: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onFormChange({ ...form, type: type.id })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      form.type === type.id
                        ? type.color
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priorità
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onFormChange({ ...form, priority: p })}
                    className={cn(
                      'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2',
                      form.priority === p
                        ? p === 'high'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                          : p === 'medium'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                            : 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                        : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {p === 'low' ? 'Bassa' : p === 'medium' ? 'Media' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Note (opzionale)
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  onFormChange({ ...form, description: e.target.value })
                }
                placeholder="Dettagli aggiuntivi..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Annulla
              </Button>
              <Button
                className="flex-1"
                onClick={onSave}
                disabled={!form.title.trim()}
              >
                {editingEvent ? 'Salva' : 'Aggiungi'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

