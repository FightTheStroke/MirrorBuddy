/**
 * @file use-calendar-view.ts
 * @brief Custom hook for calendar view logic
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCalendarStore, type SchoolEvent } from '@/lib/stores';
import { useScheduler } from '@/lib/hooks/use-scheduler';
import { getCalendarDays } from '../utils/calendar-utils';
import { SUBJECTS, type EventType, type Priority } from '../constants';

export type ViewTab = 'calendar' | 'schedule' | 'notifications';

export interface NewEventForm {
  title: string;
  subject: string;
  type: EventType;
  date: string;
  description: string;
  priority: Priority;
}

const initialForm: NewEventForm = {
  title: '',
  subject: SUBJECTS[0],
  type: 'homework',
  date: new Date().toISOString().split('T')[0],
  description: '',
  priority: 'medium',
};

export function useCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [newEvent, setNewEvent] = useState<NewEventForm>(initialForm);
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');

  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleCompleted,
    getSuggestedMaestri,
  } = useCalendarStore();

  const {
    schedule,
    isLoading: schedulerLoading,
    createSession,
    updateSession,
    deleteSession,
    updatePreferences,
  } = useScheduler();

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth, events),
    [currentMonth, events]
  );

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

    setNewEvent(initialForm);
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
    setNewEvent(initialForm);
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

  const openAddForm = useCallback(() => {
    setNewEvent(initialForm);
    setEditingEvent(null);
    setShowAddForm(true);
  }, []);

  return {
    currentMonth,
    setCurrentMonth,
    showAddForm,
    setShowAddForm,
    editingEvent,
    newEvent,
    setNewEvent,
    activeTab,
    setActiveTab,
    events,
    calendarDays,
    suggestions,
    schedule,
    schedulerLoading,
    handleAddEvent,
    handleUpdateEvent,
    startEditing,
    openAddForm,
    closeForm,
    deleteEvent,
    toggleCompleted,
    createSession,
    updateSession,
    deleteSession,
    updatePreferences,
  };
}

