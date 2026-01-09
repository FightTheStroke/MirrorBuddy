'use client';

import { WeeklySchedule, NotificationPreferences } from '@/components/scheduler';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/scheduler/types';
import { useCalendarView } from './calendar-view/hooks/use-calendar-view';
import { CalendarHeader } from './calendar-view/components/calendar-header';
import { TabNavigation } from './calendar-view/components/tab-navigation';
import { MaestriSuggestions } from './calendar-view/components/maestri-suggestions';
import { CalendarGrid } from './calendar-view/components/calendar-grid';
import { UpcomingEvents } from './calendar-view/components/upcoming-events';
import { EventFormModal } from './calendar-view/components/event-form-modal';

export function CalendarView() {
  const {
    currentMonth,
    setCurrentMonth,
    showAddForm,
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
  } = useCalendarView();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <CalendarHeader onAddClick={openAddForm} activeTab={activeTab} />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'calendar' && (
        <>
          {suggestions.length > 0 && (
            <MaestriSuggestions suggestions={suggestions} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CalendarGrid
              currentMonth={currentMonth}
              calendarDays={calendarDays}
              onMonthChange={setCurrentMonth}
              onEventClick={startEditing}
            />

            <UpcomingEvents
              events={events}
              onToggleCompleted={toggleCompleted}
              onEdit={startEditing}
              onDelete={deleteEvent}
            />
          </div>
        </>
      )}

      {activeTab === 'schedule' && (
        <WeeklySchedule
          sessions={schedule?.weeklyPlan || []}
          onCreateSession={createSession}
          onUpdateSession={updateSession}
          onDeleteSession={deleteSession}
          isLoading={schedulerLoading}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationPreferences
          preferences={
            schedule?.preferences || DEFAULT_NOTIFICATION_PREFERENCES
          }
          onUpdate={updatePreferences}
          isLoading={schedulerLoading}
        />
      )}

      <EventFormModal
        show={showAddForm}
        editingEvent={editingEvent}
        form={newEvent}
        onFormChange={setNewEvent}
        onSave={editingEvent ? handleUpdateEvent : handleAddEvent}
        onCancel={closeForm}
      />
    </div>
  );
}
