'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  GraduationCap,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCalendarStore, type SchoolEvent } from '@/lib/stores/app-store';
import { maestri as MAESTRI } from '@/data/maestri';
import { cn } from '@/lib/utils';

type EventType = SchoolEvent['type'];
type Priority = SchoolEvent['priority'];

const EVENT_TYPES: Array<{ id: EventType; label: string; icon: React.ElementType; color: string }> = [
  { id: 'test', label: 'Verifica', icon: FileText, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
  { id: 'exam', label: 'Esame', icon: GraduationCap, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  { id: 'homework', label: 'Compiti', icon: BookOpen, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  { id: 'project', label: 'Progetto', icon: Lightbulb, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
  { id: 'lesson', label: 'Lezione', icon: Clock, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
];

const SUBJECTS = [
  'Matematica', 'Italiano', 'Storia', 'Inglese', 'Scienze',
  'Fisica', 'Chimica', 'Biologia', 'Arte', 'Filosofia',
  'Geografia', 'Musica', 'Latino', 'Greco', 'Educazione Fisica',
];

const PRIORITY_COLORS = {
  low: 'border-l-green-500',
  medium: 'border-l-amber-500',
  high: 'border-l-red-500',
};

interface NewEventForm {
  title: string;
  subject: string;
  type: EventType;
  date: string;
  description: string;
  priority: Priority;
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    subject: SUBJECTS[0],
    type: 'homework',
    date: new Date().toISOString().split('T')[0],
    description: '',
    priority: 'medium',
  });

  const { events, addEvent, updateEvent, deleteEvent, toggleCompleted, getSuggestedMaestri } = useCalendarStore();

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start

    const days: Array<{ date: Date; isCurrentMonth: boolean; events: SchoolEvent[] }> = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        events: events.filter(e => isSameDay(new Date(e.date), date)),
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        events: events.filter(e => isSameDay(new Date(e.date), date)),
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        events: events.filter(e => isSameDay(new Date(e.date), date)),
      });
    }

    return days;
  }, [currentMonth, events]);

  // Get maestri suggestions
  const suggestions = useMemo(() => getSuggestedMaestri(), [getSuggestedMaestri]);

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) return;

    addEvent({
      title: newEvent.title,
      subject: newEvent.subject,
      type: newEvent.type,
      date: new Date(newEvent.date),
      description: newEvent.description || undefined,
      priority: newEvent.priority,
    });

    setNewEvent({
      title: '',
      subject: SUBJECTS[0],
      type: 'homework',
      date: new Date().toISOString().split('T')[0],
      description: '',
      priority: 'medium',
    });
    setShowAddForm(false);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !newEvent.title.trim()) return;

    updateEvent(editingEvent.id, {
      title: newEvent.title,
      subject: newEvent.subject,
      type: newEvent.type,
      date: new Date(newEvent.date),
      description: newEvent.description || undefined,
      priority: newEvent.priority,
    });

    setEditingEvent(null);
    setNewEvent({
      title: '',
      subject: SUBJECTS[0],
      type: 'homework',
      date: new Date().toISOString().split('T')[0],
      description: '',
      priority: 'medium',
    });
  };

  const startEditing = (event: SchoolEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      subject: event.subject,
      type: event.type,
      date: new Date(event.date).toISOString().split('T')[0],
      description: event.description || '',
      priority: event.priority,
    });
    setShowAddForm(true);
  };

  const getEventTypeConfig = (type: EventType) => {
    return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
  };

  const getMaestroById = (id: string) => {
    return MAESTRI.find(m => m.id === id);
  };

  // Handle Escape key to close modal
  const closeForm = useCallback(() => {
    setShowAddForm(false);
    setEditingEvent(null);
  }, []);

  useEffect(() => {
    if (!showAddForm) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeForm();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAddForm, closeForm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            Calendario Scolastico
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Pianifica verifiche, compiti e progetti
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuovo Evento
        </Button>
      </div>

      {/* Maestri Suggestions */}
      {suggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Maestri Consigliati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {suggestions.slice(0, 3).map((suggestion) => {
                const maestro = getMaestroById(suggestion.maestroId);
                if (!maestro) return null;

                return (
                  <motion.div
                    key={suggestion.maestroId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm',
                      suggestion.priority === 'high' && 'ring-2 ring-red-500',
                      suggestion.priority === 'medium' && 'ring-2 ring-amber-500'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                      {maestro.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {maestro.displayName}
                      </p>
                      <p className="text-xs text-slate-500">{suggestion.reason}</p>
                    </div>
                    {suggestion.priority === 'high' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">
                {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Oggi
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isToday = isSameDay(day.date, new Date());

                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[80px] p-1 rounded-lg border transition-colors',
                      day.isCurrentMonth
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-transparent',
                      isToday && 'ring-2 ring-blue-500'
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium mb-1',
                      isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                    )}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.events.slice(0, 2).map(event => {
                        const typeConfig = getEventTypeConfig(event.type);
                        return (
                          <div
                            key={event.id}
                            onClick={() => startEditing(event)}
                            className={cn(
                              'text-[10px] px-1 py-0.5 rounded truncate cursor-pointer transition-opacity',
                              typeConfig.color,
                              event.completed && 'opacity-50 line-through'
                            )}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {day.events.length > 2 && (
                        <div className="text-[10px] text-slate-500">
                          +{day.events.length - 2} altri
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prossimi Eventi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events
              .filter(e => !e.completed && new Date(e.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5)
              .map(event => {
                const typeConfig = getEventTypeConfig(event.type);
                const Icon = typeConfig.icon;
                const daysUntil = Math.ceil(
                  (new Date(event.date).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
                );

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-3 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-800/50',
                      PRIORITY_COLORS[event.priority]
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div className={cn('p-1.5 rounded', typeConfig.color)}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">
                            {event.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {event.subject} • {daysUntil === 0 ? 'Oggi' : daysUntil === 1 ? 'Domani' : `${daysUntil} giorni`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleCompleted(event.id)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={() => startEditing(event)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

            {events.filter(e => !e.completed && new Date(e.date) >= new Date()).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nessun evento in programma</p>
                <p className="text-xs mt-1">Aggiungi verifiche e compiti!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Event Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddForm(false);
              setEditingEvent(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingEvent ? 'Modifica Evento' : 'Nuovo Evento'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEvent(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Titolo
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Es: Verifica di matematica"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Materia
                  </label>
                  <select
                    value={newEvent.subject}
                    onChange={e => setNewEvent({ ...newEvent, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setNewEvent({ ...newEvent, type: type.id })}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                          newEvent.type === type.id
                            ? type.color
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priorita
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as Priority[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setNewEvent({ ...newEvent, priority: p })}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2',
                          newEvent.priority === p
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Note (opzionale)
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Dettagli aggiuntivi..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEvent(null);
                    }}
                  >
                    Annulla
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                    disabled={!newEvent.title.trim()}
                  >
                    {editingEvent ? 'Salva' : 'Aggiungi'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
